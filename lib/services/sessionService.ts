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
- Rescue when the candidate seems stuck or confused — rephrase, offer a hint, or pivot to an easier angle.
- End after 4-6 substantive questions have been covered well, or if the candidate has clearly demonstrated their level.

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
  return [
    `Role: ${signals.role}`,
    `Seniority: ${signals.seniority}`,
    `Interview type: ${session.interviewType}`,
    `Focus areas: ${signals.focusAreas?.join(', ') || 'general'}`,
    `Tech stack: ${signals.stack?.join(', ') || 'general'}`,
  ].join('\n');
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

    // Build context for the first question
    const contextMessage = await buildContextMessage(sessionId);

    // Ask the LLM for the opening question
    const result = await llm.generateStructuredOutput({
      messages: [
        { role: 'system', content: ORCHESTRATOR_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Session context:\n${contextMessage}\n\nGenerate the opening interview question. This is the very first question — make it a good icebreaker that's relevant to the role.`,
        },
      ],
      schema: orchestratorResultSchema,
      schemaName: ORCHESTRATOR_SCHEMA_NAME,
      temperature: 0.6,
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
    const lastQuestion = existingQuestions[existingQuestions.length - 1];
    if (lastQuestion) {
      await questionRepository.setAnswer(lastQuestion._id.toString(), transcript);
    }

    // 3. Build lean conversation history (no full JD)
    const contextMessage = await buildContextMessage(sessionId);
    const history = await buildConversationHistory(sessionId);

    // 4. Call LLM for the next turn decision
    const messages: LLMMessage[] = [
      { role: 'system', content: ORCHESTRATOR_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Session context:\n${contextMessage}\n\nThe interview is in progress. Based on the conversation so far, decide the next action and generate the next question (or end the interview if appropriate). Question count so far: ${currentOrder}.`,
      },
      ...history,
      // The latest answer appended again explicitly in case it wasn't in history yet
      { role: 'user', content: transcript },
    ];

    const result: OrchestratorResult = await llm.generateStructuredOutput({
      messages,
      schema: orchestratorResultSchema,
      schemaName: ORCHESTRATOR_SCHEMA_NAME,
      temperature: 0.6,
    });

    // 5. Persist the new question
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

    // 6. If the LLM decided to end, mark session completed
    if (result.action === 'end') {
      await sessionRepository.updateStatus(sessionId, 'completed');
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
    const lastQuestion = existingQuestions[existingQuestions.length - 1];
    if (lastQuestion) {
      await questionRepository.setAnswer(lastQuestion._id.toString(), transcript);
    }

    // 2. Build lean payload
    const contextMessage = await buildContextMessage(sessionId);
    const history = await buildConversationHistory(sessionId);

    const messages: LLMMessage[] = [
      { role: 'system', content: ORCHESTRATOR_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Session context:\n${contextMessage}\n\nThe interview is in progress. Based on the conversation so far, decide the next action and generate the next question (or end the interview if appropriate). Question count so far: ${currentOrder}.`,
      },
      ...history,
      { role: 'user', content: transcript },
    ];

    // 3. Get structured decision from LLM
    const result: OrchestratorResult = await llm.generateStructuredOutput({
      messages,
      schema: orchestratorResultSchema,
      schemaName: ORCHESTRATOR_SCHEMA_NAME,
      temperature: 0.6,
    });

    // 4. Yield chunks in order
    yield { type: 'decision' as const, action: result.action };
    yield {
      type: 'question' as const,
      text: result.questionText,
      questionType: result.questionType,
      isFollowUp: result.isFollowUp,
    };

    // 5. Persist
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
  },

  async abandon(userId: string, sessionId: string): Promise<void> {
    await assertSessionOwnership(userId, sessionId);
    await sessionRepository.updateStatus(sessionId, 'abandoned');
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
