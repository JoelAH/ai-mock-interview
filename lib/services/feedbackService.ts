/**
 * Feedback Service — scores answers and generates feedback reports.
 *
 * Framework-agnostic: no HTTP or Next.js imports.
 * In mock mode, returns static fixtures. In production mode, calls the
 * LLM layer for structured scoring and persists via repositories.
 *
 * Two main operations:
 * 1. scoreAnswer — called silently after each turn (background, never mid-interview)
 * 2. generateReport — called at session end, produces the full report
 */
import type { FeedbackReportResponse, DashboardResponse } from '@/lib/schemas';
import {
  answerScoringResultSchema,
  ANSWER_SCORING_SCHEMA_NAME,
  reportGenerationResultSchema,
  REPORT_GENERATION_SCHEMA_NAME,
} from '@/lib/schemas';
import { mockFeedbackReportResponse, mockDashboardResponse } from '@/lib/mock';
import { isMockMode } from '@/lib/env';
import { llm } from '@/lib/llm';
import {
  questionRepository,
  sessionRepository,
  feedbackRepository,
} from '@/lib/repositories';
import { audit } from '@/lib/services/auditService';

export interface IFeedbackService {
  /**
   * Scores a single answer silently (background). Persists scores to the question.
   * Never surfaces scores mid-interview — they are only visible in the report.
   */
  scoreAnswer(sessionId: string, questionId: string, transcript: string): Promise<void>;

  /**
   * Generates a feedback report for a completed session.
   * Calls generateStructuredOutput over the full transcript to produce
   * overall + sub-scores + synthesized insight.
   */
  generateReport(userId: string, sessionId: string): Promise<FeedbackReportResponse>;

  /**
   * Returns dashboard data: past sessions with scores and trend info.
   */
  getDashboard(userId: string): Promise<DashboardResponse>;
}

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const ANSWER_SCORING_PROMPT = `You are an expert interview coach scoring a candidate's answer.

Score the answer on three dimensions (0-100 each):
- relevance: How directly does the answer address the question asked?
- depth: Does the answer include specifics, numbers, tradeoffs, concrete examples?
- clarity: Is the answer well-articulated, concise, and easy to follow?

Also provide brief "strongAnswerNotes" — what a top candidate would include that this answer is missing or could improve on. Keep notes to 1-2 sentences.

Be fair but rigorous. A score of 70+ means solid, 80+ is strong, 90+ is exceptional.`;

const REPORT_GENERATION_PROMPT = `You are an expert interview coach generating a performance report for a practice interview.

Given the full transcript of questions and answers, produce:
- overallScore (0-100): holistic assessment of interview performance
- technicalAccuracyScore (0-100): domain knowledge, correctness, technical depth
- communicationScore (0-100): articulation, conciseness, confidence
- structureScore (0-100): answer organization, use of frameworks (STAR, etc.), logical flow
- diagnosis: one plain-English sentence summarizing the performance (e.g. "Strong technical foundation with room to improve answer structure")
- synthesizedInsight: actionable 2-3 sentence advice for what to focus on next time, based on patterns across all answers

Be calibrated: 60 = needs work, 70 = solid, 80 = strong, 90+ = exceptional. Most candidates should fall in the 65-80 range.`;

// ---------------------------------------------------------------------------
// Real implementation
// ---------------------------------------------------------------------------

const realFeedbackService: IFeedbackService = {
  async scoreAnswer(sessionId: string, questionId: string, transcript: string): Promise<void> {
    // Get the question for context
    const question = await questionRepository.findById(questionId);
    if (!question || !transcript.trim()) return;

    const result = await llm.generateStructuredOutput({
      messages: [
        { role: 'system', content: ANSWER_SCORING_PROMPT },
        {
          role: 'user',
          content: `Question: "${question.text}"\n\nCandidate's answer: "${transcript}"`,
        },
      ],
      schema: answerScoringResultSchema,
      schemaName: ANSWER_SCORING_SCHEMA_NAME,
      temperature: 0.2,
    });

    // Persist scores to the question document
    await questionRepository.setScores(
      questionId,
      { relevance: result.relevance, depth: result.depth, clarity: result.clarity },
      result.strongAnswerNotes,
    );
  },

  async generateReport(userId: string, sessionId: string): Promise<FeedbackReportResponse> {
    // Verify ownership before generating report
    const session = await sessionRepository.findByIdAndUser(sessionId, userId);
    if (!session) {
      throw new Error(`Access denied: session ${sessionId} not found or not owned by user.`);
    }

    // 1. Get all questions for this session
    const questions = await questionRepository.findBySessionId(sessionId);

    if (questions.length === 0) {
      throw new Error(`No questions found for session ${sessionId}.`);
    }

    // 2. Check session status — abandoned sessions are not scored
    const isAbandoned = session.status === 'abandoned';

    if (isAbandoned) {
      return {
        sessionId,
        abandoned: true,
        overallScore: null,
        technicalAccuracyScore: null,
        communicationScore: null,
        structureScore: null,
        synthesizedInsight: null,
        diagnosis: null,
        questions: questions.map((q) => ({
          text: q.text,
          type: q.type as 'behavioral' | 'architectural' | 'follow_up' | 'rescue',
          order: q.order,
          isFollowUp: q.isFollowUp ?? false,
          answerTranscript: q.answerTranscript ?? '',
          scores: q.scores ?? null,
          strongAnswerNotes: q.strongAnswerNotes ?? '',
        })),
      };
    }

    // 3. Check if a report already exists (avoid duplicate key error on revisit)
    const existing = await feedbackRepository.findBySessionId(sessionId);

    if (existing) {
      return {
        sessionId,
        abandoned: false,
        overallScore: existing.overallScore,
        technicalAccuracyScore: existing.technicalAccuracyScore,
        communicationScore: existing.communicationScore,
        structureScore: existing.structureScore,
        synthesizedInsight: existing.synthesizedInsight,
        diagnosis: (existing as { diagnosis?: string }).diagnosis ?? '',
        questions: questions.map((q) => ({
          text: q.text,
          type: q.type as 'behavioral' | 'architectural' | 'follow_up' | 'rescue',
          order: q.order,
          isFollowUp: q.isFollowUp ?? false,
          answerTranscript: q.answerTranscript ?? '',
          scores: q.scores ?? null,
          strongAnswerNotes: q.strongAnswerNotes ?? '',
        })),
      };
    }

    // 4. Build the full transcript for the LLM
    const transcriptLines = questions.map((q, i) => {
      const answer = q.answerTranscript || '(no answer recorded)';
      return `Q${i + 1} [${q.type}]: ${q.text}\nA${i + 1}: ${answer}`;
    });

    const fullTranscript = transcriptLines.join('\n\n');

    // 5. Call LLM for the holistic report
    const result = await llm.generateStructuredOutput({
      messages: [
        { role: 'system', content: REPORT_GENERATION_PROMPT },
        {
          role: 'user',
          content: `Interview transcript (${questions.length} questions):\n\n${fullTranscript}`,
        },
      ],
      schema: reportGenerationResultSchema,
      schemaName: REPORT_GENERATION_SCHEMA_NAME,
      temperature: 0.3,
    });

    // 6. Persist feedback report
    await feedbackRepository.create({
      sessionId,
      overallScore: result.overallScore,
      technicalAccuracyScore: result.technicalAccuracyScore,
      communicationScore: result.communicationScore,
      structureScore: result.structureScore,
      synthesizedInsight: result.synthesizedInsight,
    });

    // 7. Update session's overall score
    await sessionRepository.setOverallScore(sessionId, result.overallScore);

    audit({
      source: 'system',
      eventName: 'feedback_report_generated',
      payload: {
        userId,
        sessionId,
        overallScore: result.overallScore,
        technicalAccuracyScore: result.technicalAccuracyScore,
        communicationScore: result.communicationScore,
        structureScore: result.structureScore,
      },
      outcome: 'success',
      note: `Feedback generated — overall score: ${result.overallScore}`,
    });

    // 8. Build and return the full response (includes per-question breakdown)
    return {
      sessionId,
      abandoned: false,
      overallScore: result.overallScore,
      technicalAccuracyScore: result.technicalAccuracyScore,
      communicationScore: result.communicationScore,
      structureScore: result.structureScore,
      synthesizedInsight: result.synthesizedInsight,
      diagnosis: result.diagnosis,
      questions: questions.map((q) => ({
        text: q.text,
        type: q.type as 'behavioral' | 'architectural' | 'follow_up' | 'rescue',
        order: q.order,
        isFollowUp: q.isFollowUp ?? false,
        answerTranscript: q.answerTranscript ?? '',
        scores: q.scores ?? null,
        strongAnswerNotes: q.strongAnswerNotes ?? '',
      })),
    };
  },

  async getDashboard(userId: string): Promise<DashboardResponse> {
    // Get all sessions for this user
    const sessions = await sessionRepository.findByUserId(userId);

    const sessionSummaries = sessions.map((s) => ({
      sessionId: s._id.toString(),
      interviewType: s.interviewType as 'behavioral' | 'technical' | 'architectural' | 'mix',
      status: s.status as 'setup' | 'in_progress' | 'completed' | 'abandoned',
      overallScore: s.overallScore ?? null,
      createdAt: (s as { createdAt?: Date }).createdAt?.toISOString() ?? new Date().toISOString(),
      parsedSignals: s.parsedSignals ?? null,
    }));

    // Calculate average score from completed sessions (exclude abandoned)
    const scoredSessions = sessionSummaries.filter(
      (s) => s.overallScore !== null && s.status !== 'abandoned',
    );
    const averageScore =
      scoredSessions.length > 0
        ? Math.round(
            scoredSessions.reduce((sum, s) => sum + s.overallScore!, 0) / scoredSessions.length,
          )
        : null;

    return {
      sessions: sessionSummaries,
      totalSessions: sessions.length,
      averageScore,
    };
  },
};

// ---------------------------------------------------------------------------
// Mock implementation — returns static fixtures.
// ---------------------------------------------------------------------------

const mockFeedbackService: IFeedbackService = {
  async scoreAnswer(_sessionId: string, _questionId: string, _transcript: string): Promise<void> {
    // No-op in mock mode
  },

  async generateReport(_userId: string, sessionId: string): Promise<FeedbackReportResponse> {
    return {
      ...mockFeedbackReportResponse,
      sessionId,
    };
  },

  async getDashboard(_userId: string): Promise<DashboardResponse> {
    return { ...mockDashboardResponse };
  },
};

// ---------------------------------------------------------------------------
// Export — resolved at call time based on environment.
// ---------------------------------------------------------------------------

export const feedbackService: IFeedbackService = {
  scoreAnswer(...args) {
    return isMockMode()
      ? mockFeedbackService.scoreAnswer(...args)
      : realFeedbackService.scoreAnswer(...args);
  },
  generateReport(...args) {
    return isMockMode()
      ? mockFeedbackService.generateReport(...args)
      : realFeedbackService.generateReport(...args);
  },
  getDashboard(...args) {
    return isMockMode()
      ? mockFeedbackService.getDashboard(...args)
      : realFeedbackService.getDashboard(...args);
  },
};
