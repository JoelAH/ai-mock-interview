/**
 * Session Service — manages the live interview turn loop.
 *
 * Framework-agnostic: no HTTP or Next.js imports.
 * In mock mode, advances through fixture questions deterministically.
 * In production mode, calls the LLM orchestrator for adaptive follow-ups
 * and persists each turn via the question repository.
 */
import type { SessionTurnResponse, SessionStatusResponse, TurnChunk, OrchestratorResult } from '@/lib/schemas';
import { orchestratorResultSchema, ORCHESTRATOR_SCHEMA_NAME } from '@/lib/schemas';
import { mockQuestions } from '@/lib/mock';
import { isMockMode } from '@/lib/env';
import { llm } from '@/lib/llm';
import type { LLMMessage } from '@/lib/llm';
import { sessionRepository, questionRepository } from '@/lib/repositories';
import { audit } from '@/lib/services/auditService';
import { feedbackService } from '@/lib/services/feedbackService';

export interface ISessionService {
  /**
   * Processes a single turn: takes the user's transcript and returns
   * the next question + a probe/advance/rescue/end decision.
   */
  processTurn(userId: string, sessionId: string, transcript: string): Promise<SessionTurnResponse>;

  /**
   * Streaming variant of processTurn — returns an async iterable of chunks
   * for real-time delivery to the client. Used by the route handler for SSE.
   */
  processTurnStream(userId: string, sessionId: string, transcript: string): AsyncIterable<TurnChunk>;

  /**
   * Returns current session status (question count, progress).
   */
  getStatus(userId: string, sessionId: string): Promise<SessionStatusResponse>;

  /**
   * Starts a session — transitions from setup to in_progress.
   */
  start(userId: string, sessionId: string): Promise<SessionTurnResponse>;

  /**
   * Ends a session — transitions to completed.
   */
  end(userId: string, sessionId: string): Promise<void>;

  /**
   * Abandons a session early — transitions to abandoned.
   * Still counts toward the user's monthly usage.
   */
  abandon(userId: string, sessionId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// System prompt — lean, provider-neutral, focused on the orchestrator role.
// ---------------------------------------------------------------------------

const ORCHESTRATOR_SYSTEM_PROMPT = `You are an experienced technical interviewer conducting a practice interview.

Your role:
- Ask clear, specific questions appropriate for the role and interview type.
- After each candidate answer, decide whether to PROBE deeper, ADVANCE to a new topic, RESCUE if they're stuck, or END if sufficient ground has been covered.
- Probe when the answer is promising but shallow — ask for specifics, numbers, tradeoffs, or alternatives.
- Advance when the answer is thorough enough or a new topic would be more valuable.
- Advance IMMEDIATELY when the candidate says they don't know, are unfamiliar with, or have no experience with a topic. Do NOT probe further on something they've explicitly said they cannot answer — move to a different topic.
- Rescue when the candidate seems stuck or confused — rephrase, offer a hint, or pivot to an easier angle.
- End after 4-6 substantive topics have been covered well, or if the candidate has clearly demonstrated their level.

Follow-up limits (STRICT — you MUST obey these):
- You may ask AT MOST 2 follow-up probes on the same topic before you MUST advance to a new topic.
- After 2 consecutive probes, your next action MUST be "advance" — no exceptions.
- Prefer to advance after 1 probe unless the answer was clearly incomplete or evasive.
- A good interview covers breadth, not just depth. Aim for 4-6 distinct topics across the session.

Question type labeling:
- When isFollowUp is true, questionType MUST be "follow_up". Never label a follow-up as "behavioral", "technical", or "architectural".
- Use "behavioral" only for NEW standalone behavioral questions — these ask about past experiences, teamwork, leadership, conflict resolution, or decision-making processes (the STAR-method style).
- Use "technical" for NEW standalone questions about specific technologies, languages, frameworks, tools, algorithms, data structures, coding patterns, or domain knowledge (e.g. "How do you design a PostgreSQL schema?", "Explain event-driven architecture", "What strategies do you use for caching?").
- Use "architectural" for NEW standalone system design questions that ask the candidate to design, scale, or evaluate a whole system or major component (e.g. "Design a URL shortener", "How would you scale this service to 10x traffic?").
- Use "rescue" when rephrasing or offering a hint on the current topic.
- Rule of thumb: if the question tests *knowledge of a specific technology or concept*, it's "technical". If it asks them to *design or architect a system end-to-end*, it's "architectural". If it asks about *how they handled a situation or made a decision*, it's "behavioral".

Question distribution:
- Prioritize technical and architectural questions that probe the candidate's understanding of the technologies, systems, and patterns mentioned in the role/stack/focus areas.
- Items listed earlier in the tech stack and focus areas are MORE IMPORTANT — they reflect the JD's priority order. Start with those before moving to items listed later.
- Aim for roughly 40-50% technical questions, 20-30% architectural questions, and 20-30% behavioral questions.
- Behavioral questions should focus on technical leadership, decision-making, and problem-solving — not generic "meetings and collaboration" topics.
- Draw questions directly from the tech stack and focus areas provided in the session context.
- Do NOT over-index on testing, tooling, or "nice to have" skills. Prioritize core competencies (languages, frameworks, databases, architecture) first.

Rules:
- Keep questions concise (1-3 sentences).
- Never repeat a question already asked.
- Do not reveal scores or evaluate the answer aloud.
- Stay in character as a friendly but professional interviewer.
- Base follow-ups only on what the candidate actually said — do not assume unstated knowledge.`;

// ---------------------------------------------------------------------------
// Helper: build conversation history from persisted questions
// ---------------------------------------------------------------------------

async function buildConversationHistory(sessionId: string): Promise<LLMMessage[]> {
  const questions = await questionRepository.findBySessionId(sessionId);
  const messages: LLMMessage[] = [];

  for (const q of questions) {
    // Interviewer's question
    messages.push({ role: 'assistant', content: q.text });
    // Candidate's answer (if any)
    if (q.answerTranscript) {
      messages.push({ role: 'user', content: q.answerTranscript });
    }
  }

  return messages;
}

/**
 * Build the context message that gives the LLM session context
 * WITHOUT including the full JD (per cost rules).
 */
async function buildContextMessage(sessionId: string): Promise<string> {
  const session = await sessionRepository.findById(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found.`);
  }

  const signals = session.parsedSignals;
  if (!signals) {
    return `Interview type: ${session.interviewType}. No additional context available.`;
  }

  // Lean context — role + type + focus areas only (not the full JD text)
  // Items are listed in priority order (first = most important from the JD)
  return [
    `Role: ${signals.role}`,
    `Seniority: ${signals.seniority}`,
    `Interview type: ${session.interviewType}`,
    `Focus areas (in priority order — earlier = more important): ${signals.focusAreas?.join(', ') || 'general'}`,
    `Tech stack (in priority order — earlier = more important): ${signals.stack?.join(', ') || 'general'}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Follow-up limit enforcement — hard cap at 2 consecutive follow-ups.
// ---------------------------------------------------------------------------

/** Maximum consecutive follow-up probes allowed before forcing an advance. */
const MAX_CONSECUTIVE_FOLLOWUPS = 2;

/**
 * Count the number of consecutive follow-up questions at the tail of the
 * question list. Used to enforce the hard follow-up cap regardless of what
 * the LLM decides.
 */
function countConsecutiveFollowups(questions: Array<{ isFollowUp?: boolean }>): number {
  let count = 0;
  for (let i = questions.length - 1; i >= 0; i--) {
    if (questions[i].isFollowUp) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Enforce follow-up limits on the LLM's decision. If we've already hit
 * the max consecutive follow-ups, override the result to force an advance.
 * Also fixes type labeling: if isFollowUp is true, questionType must be 'follow_up'.
 */
function enforceFollowupLimits(
  result: OrchestratorResult,
  consecutiveFollowups: number,
): OrchestratorResult {
  // Fix type labeling: follow-ups must have type 'follow_up'
  if (result.isFollowUp && result.questionType !== 'follow_up') {
    result = { ...result, questionType: 'follow_up' };
  }

  // If we've hit the limit and the LLM still wants to probe, deny it
  if (consecutiveFollowups >= MAX_CONSECUTIVE_FOLLOWUPS && result.action === 'probe') {
    // The LLM already generated a follow-up question, but we can't use it.
    // We'll still return the question but mark it as NOT a follow-up and force advance.
    // The question text might still be a follow-up style question, but the action
    // forces the next turn to be treated as a new topic. This is acceptable since
    // the prompt should prevent this case, but this is a hard guard.
    return {
      ...result,
      action: 'advance',
      isFollowUp: false,
      questionType: result.questionType === 'follow_up' ? 'technical' : result.questionType,
    };
  }

  return result;
}

// ---------------------------------------------------------------------------
// Ownership guard — ensures the session belongs to the requesting user.
// ---------------------------------------------------------------------------

async function assertSessionOwnership(userId: string, sessionId: string): Promise<void> {
  const session = await sessionRepository.findByIdAndUser(sessionId, userId);
  if (!session) {
    throw new SessionOwnershipError(sessionId);
  }
}

/** Thrown when a user attempts to access a session they don't own. */
export class SessionOwnershipError extends Error {
  constructor(sessionId: string) {
    super(`Access denied: session ${sessionId} not found or not owned by user.`);
    this.name = 'SessionOwnershipError';
  }
}

// ---------------------------------------------------------------------------
// Real implementation
// ---------------------------------------------------------------------------

const realSessionService: ISessionService = {
  async start(userId: string, sessionId: string): Promise<SessionTurnResponse> {
    // Verify ownership before proceeding
    await assertSessionOwnership(userId, sessionId);

    // Transition session to in_progress
    await sessionRepository.updateStatus(sessionId, 'in_progress');

    audit({
      source: 'system',
      eventName: 'session_started',
      payload: { userId, sessionId },
      outcome: 'success',
      note: `Interview session started`,
    });

    // Build context for the first question
    const contextMessage = await buildContextMessage(sessionId);

    // Ask the LLM for the opening question
    // Add a random seed phrase to encourage variety across sessions
    const openers = [
      'Start with a question about a past technical decision.',
      'Open with a question about how they handle ambiguity or uncertainty.',
      'Begin with a question about a time they influenced a technical direction.',
      'Start by asking about a challenging system they designed or improved.',
      'Open with a question about how they approach working with cross-functional teams.',
      'Begin with a question about a tradeoff they had to make under time pressure.',
      'Start with a question about how they onboard into a new codebase or team.',
      'Open with a question about a time they disagreed with a technical approach.',
      'Begin by asking about their approach to breaking down a large project.',
      'Start with a question about a production incident they navigated.',
    ];
    const opener = openers[Math.floor(Math.random() * openers.length)];

    const result = await llm.generateStructuredOutput({
      messages: [
        { role: 'system', content: ORCHESTRATOR_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Session context:\n${contextMessage}\n\nGenerate the opening interview question. This is the very first question — make it a good icebreaker that's relevant to the role. ${opener}`,
        },
      ],
      schema: orchestratorResultSchema,
      schemaName: ORCHESTRATOR_SCHEMA_NAME,
      temperature: 0.85,
    });

    // Persist the question
    const question = await questionRepository.create({
      sessionId,
      text: result.questionText,
      type: result.questionType,
      order: 0,
      isFollowUp: false,
      answerTranscript: '',
      scores: null,
      strongAnswerNotes: '',
    });

    return {
      questionText: result.questionText,
      questionType: result.questionType,
      isFollowUp: false,
      questionOrder: 0,
      action: 'advance',
    };
  },

  async processTurn(userId: string, sessionId: string, transcript: string): Promise<SessionTurnResponse> {
    // Verify ownership before proceeding
    await assertSessionOwnership(userId, sessionId);

    // 1. Get current question count to determine order
    const existingQuestions = await questionRepository.findBySessionId(sessionId);
    const currentOrder = existingQuestions.length;

    // 2. Save the transcript to the most recent question (the one being answered)
    const questionBeingAnswered = existingQuestions[existingQuestions.length - 1];
    if (questionBeingAnswered) {
      await questionRepository.setAnswer(questionBeingAnswered._id.toString(), transcript);
    }

    // 2b. If session is already completed (user answering the final question),
    // await scoring so the feedback report has scores immediately, then signal done.
    const session = await sessionRepository.findById(sessionId);
    if (session?.status === 'completed') {
      if (questionBeingAnswered && transcript.trim()) {
        await feedbackService.scoreAnswer(sessionId, questionBeingAnswered._id.toString(), transcript);
      }
      return {
        questionText: '',
        questionType: 'technical',
        isFollowUp: false,
        questionOrder: currentOrder - 1,
        action: 'end',
      };
    }

    // For non-final turns, score in the background (fire-and-forget)
    if (questionBeingAnswered && transcript.trim()) {
      feedbackService.scoreAnswer(sessionId, questionBeingAnswered._id.toString(), transcript).catch(() => {});
    }

    // 3. Count consecutive follow-ups for limit enforcement
    const consecutiveFollowups = countConsecutiveFollowups(existingQuestions);

    // 4. Build lean conversation history (no full JD)
    const contextMessage = await buildContextMessage(sessionId);
    const history = await buildConversationHistory(sessionId);

    // Build a list of topics already covered to prevent repetition
    const topicsCovered = existingQuestions
      .filter((q) => !q.isFollowUp)
      .map((q, i) => `${i + 1}. ${q.text.slice(0, 80)}`)
      .join('\n');
    const topicsNote = topicsCovered
      ? `\n\nTopics already asked (DO NOT repeat or rephrase these):\n${topicsCovered}`
      : '';

    // 5. Call LLM for the next turn decision — include followup count so LLM is aware
    const followupWarning = consecutiveFollowups >= MAX_CONSECUTIVE_FOLLOWUPS
      ? `\n\nIMPORTANT: You have already asked ${consecutiveFollowups} consecutive follow-ups. You MUST advance to a new topic now. Set action to "advance" and isFollowUp to false.`
      : consecutiveFollowups === 1
        ? `\n\nNote: You have asked 1 follow-up on the current topic. You may ask 1 more follow-up OR advance to a new topic.`
        : '';

    const messages: LLMMessage[] = [
      { role: 'system', content: ORCHESTRATOR_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Session context:\n${contextMessage}\n\nThe interview is in progress. Based on the conversation so far, decide the next action and generate the next question (or end the interview if appropriate). Question count so far: ${currentOrder}.${topicsNote}${followupWarning}`,
      },
      ...history,
      // The latest answer appended again explicitly in case it wasn't in history yet
      { role: 'user', content: transcript },
    ];

    let result: OrchestratorResult = await llm.generateStructuredOutput({
      messages,
      schema: orchestratorResultSchema,
      schemaName: ORCHESTRATOR_SCHEMA_NAME,
      temperature: 0.6,
    });

    // 6. Enforce follow-up limits and fix type labeling
    result = enforceFollowupLimits(result, consecutiveFollowups);

    // 7. Persist the new question
    await questionRepository.create({
      sessionId,
      text: result.questionText,
      type: result.questionType,
      order: currentOrder,
      isFollowUp: result.isFollowUp,
      answerTranscript: '',
      scores: null,
      strongAnswerNotes: '',
    });

    // 8. If the LLM decided to end, mark session completed
    if (result.action === 'end') {
      await sessionRepository.updateStatus(sessionId, 'completed');
      audit({
        source: 'system',
        eventName: 'session_completed',
        payload: { userId, sessionId, totalQuestions: currentOrder + 1 },
        outcome: 'success',
        note: `Interview ended by LLM after ${currentOrder + 1} questions`,
      });
    }

    return {
      questionText: result.questionText,
      questionType: result.questionType,
      isFollowUp: result.isFollowUp,
      questionOrder: currentOrder,
      action: result.action,
    };
  },

  async *processTurnStream(userId: string, sessionId: string, transcript: string): AsyncIterable<TurnChunk> {
    // Verify ownership before proceeding
    await assertSessionOwnership(userId, sessionId);

    // The streaming variant uses the same logic as processTurn but yields chunks
    // as they become available. For structured output, we get the full result then
    // emit chunks in order (decision → question → done). True token-level streaming
    // would use streamCompletion, but structured output needs the full parse.

    // 1. Save transcript to current question
    const existingQuestions = await questionRepository.findBySessionId(sessionId);
    const currentOrder = existingQuestions.length;
    const questionBeingAnswered = existingQuestions[existingQuestions.length - 1];
    if (questionBeingAnswered) {
      await questionRepository.setAnswer(questionBeingAnswered._id.toString(), transcript);
    }

    // 1b. If session is already completed (user answering the final question),
    // await scoring so the feedback report has scores immediately.
    const session = await sessionRepository.findById(sessionId);
    if (session?.status === 'completed') {
      if (questionBeingAnswered && transcript.trim()) {
        yield { type: 'scoring' as const };
        await feedbackService.scoreAnswer(sessionId, questionBeingAnswered._id.toString(), transcript);
      }
      yield { type: 'decision' as const, action: 'end' as const };
      yield { type: 'done' as const, questionOrder: currentOrder - 1 };
      return;
    }

    // For non-final turns, score in the background (fire-and-forget)
    if (questionBeingAnswered && transcript.trim()) {
      feedbackService.scoreAnswer(sessionId, questionBeingAnswered._id.toString(), transcript).catch(() => {});
    }

    // 2. Count consecutive follow-ups for limit enforcement
    const consecutiveFollowups = countConsecutiveFollowups(existingQuestions);

    // 3. Build lean payload
    const contextMessage = await buildContextMessage(sessionId);
    const history = await buildConversationHistory(sessionId);

    // Build a list of topics already covered to prevent repetition
    const topicsCovered = existingQuestions
      .filter((q) => !q.isFollowUp)
      .map((q, i) => `${i + 1}. ${q.text.slice(0, 80)}`)
      .join('\n');
    const topicsNote = topicsCovered
      ? `\n\nTopics already asked (DO NOT repeat or rephrase these):\n${topicsCovered}`
      : '';

    const followupWarning = consecutiveFollowups >= MAX_CONSECUTIVE_FOLLOWUPS
      ? `\n\nIMPORTANT: You have already asked ${consecutiveFollowups} consecutive follow-ups. You MUST advance to a new topic now. Set action to "advance" and isFollowUp to false.`
      : consecutiveFollowups === 1
        ? `\n\nNote: You have asked 1 follow-up on the current topic. You may ask 1 more follow-up OR advance to a new topic.`
        : '';

    const messages: LLMMessage[] = [
      { role: 'system', content: ORCHESTRATOR_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Session context:\n${contextMessage}\n\nThe interview is in progress. Based on the conversation so far, decide the next action and generate the next question (or end the interview if appropriate). Question count so far: ${currentOrder}.${topicsNote}${followupWarning}`,
      },
      ...history,
      { role: 'user', content: transcript },
    ];

    // 4. Get structured decision from LLM
    let result: OrchestratorResult = await llm.generateStructuredOutput({
      messages,
      schema: orchestratorResultSchema,
      schemaName: ORCHESTRATOR_SCHEMA_NAME,
      temperature: 0.6,
    });

    // 5. Enforce follow-up limits and fix type labeling
    result = enforceFollowupLimits(result, consecutiveFollowups);

    // 6. Yield chunks in order
    yield { type: 'decision' as const, action: result.action };
    yield {
      type: 'question' as const,
      text: result.questionText,
      questionType: result.questionType,
      isFollowUp: result.isFollowUp,
    };

    // 7. Persist
    await questionRepository.create({
      sessionId,
      text: result.questionText,
      type: result.questionType,
      order: currentOrder,
      isFollowUp: result.isFollowUp,
      answerTranscript: '',
      scores: null,
      strongAnswerNotes: '',
    });

    if (result.action === 'end') {
      await sessionRepository.updateStatus(sessionId, 'completed');
      audit({
        source: 'system',
        eventName: 'session_completed',
        payload: { userId, sessionId, totalQuestions: currentOrder + 1 },
        outcome: 'success',
        note: `Interview ended by LLM after ${currentOrder + 1} questions (stream)`,
      });
    }

    yield { type: 'done' as const, questionOrder: currentOrder };
  },

  async getStatus(userId: string, sessionId: string): Promise<SessionStatusResponse> {
    // Verify ownership — uses findByIdAndUser instead of findById
    const session = await sessionRepository.findByIdAndUser(sessionId, userId);
    if (!session) {
      throw new SessionOwnershipError(sessionId);
    }

    const questions = await questionRepository.findBySessionId(sessionId);

    return {
      sessionId,
      status: session.status as SessionStatusResponse['status'],
      currentQuestionOrder: questions.length > 0 ? questions.length - 1 : 0,
      totalQuestions: questions.length,
      interviewType: session.interviewType as SessionStatusResponse['interviewType'],
    };
  },

  async end(userId: string, sessionId: string): Promise<void> {
    await assertSessionOwnership(userId, sessionId);
    await sessionRepository.updateStatus(sessionId, 'completed');
    audit({
      source: 'system',
      eventName: 'session_completed',
      payload: { userId, sessionId },
      outcome: 'success',
      note: `Interview session completed`,
    });
  },

  async abandon(userId: string, sessionId: string): Promise<void> {
    await assertSessionOwnership(userId, sessionId);
    await sessionRepository.updateStatus(sessionId, 'abandoned');
    audit({
      source: 'system',
      eventName: 'session_abandoned',
      payload: { userId, sessionId },
      outcome: 'success',
      note: `Interview session abandoned early`,
    });
  },
};

// ---------------------------------------------------------------------------
// Mock implementation — stateful turn progression through fixture questions.
// ---------------------------------------------------------------------------

const turnIndexes = new Map<string, number>();

const mockSessionService: ISessionService = {
  async processTurn(_userId: string, sessionId: string, _transcript: string): Promise<SessionTurnResponse> {
    const currentIndex = turnIndexes.get(sessionId) ?? 0;
    const nextIndex = Math.min(currentIndex + 1, mockQuestions.length - 1);
    turnIndexes.set(sessionId, nextIndex);

    const question = mockQuestions[nextIndex];
    const isLast = nextIndex >= mockQuestions.length - 1;

    return {
      questionText: question.text,
      questionType: question.type,
      isFollowUp: question.isFollowUp,
      questionOrder: question.order,
      action: isLast ? 'end' : question.isFollowUp ? 'probe' : 'advance',
    };
  },

  async *processTurnStream(_userId: string, sessionId: string, _transcript: string): AsyncIterable<TurnChunk> {
    const currentIndex = turnIndexes.get(sessionId) ?? 0;
    const nextIndex = Math.min(currentIndex + 1, mockQuestions.length - 1);
    turnIndexes.set(sessionId, nextIndex);

    const question = mockQuestions[nextIndex];
    const isLast = nextIndex >= mockQuestions.length - 1;
    const action = isLast ? 'end' : question.isFollowUp ? 'probe' : 'advance';

    yield { type: 'decision' as const, action };
    yield {
      type: 'question' as const,
      text: question.text,
      questionType: question.type,
      isFollowUp: question.isFollowUp,
    };
    yield { type: 'done' as const, questionOrder: question.order };
  },

  async getStatus(_userId: string, sessionId: string): Promise<SessionStatusResponse> {
    const currentIndex = turnIndexes.get(sessionId) ?? 0;
    return {
      sessionId,
      status: currentIndex >= mockQuestions.length - 1 ? 'completed' : 'in_progress',
      currentQuestionOrder: currentIndex,
      totalQuestions: mockQuestions.length,
      interviewType: 'mix',
    };
  },

  async start(_userId: string, sessionId: string): Promise<SessionTurnResponse> {
    const question = mockQuestions[0];
    turnIndexes.set(sessionId, 0);
    return {
      questionText: question.text,
      questionType: question.type,
      isFollowUp: question.isFollowUp,
      questionOrder: question.order,
      action: 'advance',
    };
  },

  async end(_userId: string, sessionId: string): Promise<void> {
    turnIndexes.delete(sessionId);
  },

  async abandon(_userId: string, sessionId: string): Promise<void> {
    turnIndexes.delete(sessionId);
  },
};

// ---------------------------------------------------------------------------
// Export — resolved at call time based on environment.
// ---------------------------------------------------------------------------

export const sessionService: ISessionService = {
  processTurn(...args) {
    return isMockMode() ? mockSessionService.processTurn(...args) : realSessionService.processTurn(...args);
  },
  processTurnStream(...args) {
    return isMockMode() ? mockSessionService.processTurnStream(...args) : realSessionService.processTurnStream(...args);
  },
  getStatus(...args) {
    return isMockMode() ? mockSessionService.getStatus(...args) : realSessionService.getStatus(...args);
  },
  start(...args) {
    return isMockMode() ? mockSessionService.start(...args) : realSessionService.start(...args);
  },
  end(...args) {
    return isMockMode() ? mockSessionService.end(...args) : realSessionService.end(...args);
  },
  abandon(...args) {
    return isMockMode() ? mockSessionService.abandon(...args) : realSessionService.abandon(...args);
  },
};
