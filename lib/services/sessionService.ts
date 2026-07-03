/**
 * Session Service — manages the live interview turn loop.
 *
 * Framework-agnostic: no HTTP or Next.js imports.
 * In mock mode, advances through fixture questions deterministically.
 * In production mode, calls the LLM orchestrator for adaptive follow-ups.
 */
import type { SessionTurnResponse, SessionStatusResponse, TurnChunk } from '@/lib/schemas';
import { mockQuestions, mockSessionId } from '@/lib/mock';
import { isMockMode } from '@/lib/env';

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
}

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
};

// ---------------------------------------------------------------------------
// Real implementation placeholder — wired in Task 16.
// ---------------------------------------------------------------------------

const realSessionService: ISessionService = {
  async processTurn(_userId, _sessionId, _transcript) {
    // Task 16: call streamCompletion via LLM layer, persist turn via questionRepository.
    throw new Error('Real session orchestrator not yet implemented. Set USE_MOCKS=true or implement Task 16.');
  },

  async *processTurnStream(_userId, _sessionId, _transcript) {
    throw new Error('Real session orchestrator not yet implemented. Set USE_MOCKS=true or implement Task 16.');
  },

  async getStatus(_userId, _sessionId) {
    throw new Error('Real session status not yet implemented. Set USE_MOCKS=true or implement Task 16.');
  },

  async start(_userId, _sessionId) {
    throw new Error('Real session start not yet implemented. Set USE_MOCKS=true or implement Task 16.');
  },

  async end(_userId, _sessionId) {
    throw new Error('Real session end not yet implemented. Set USE_MOCKS=true or implement Task 16.');
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
};
