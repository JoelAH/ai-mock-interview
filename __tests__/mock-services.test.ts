import { describe, it, expect } from 'vitest';
import {
  jdParseResponseSchema,
  sessionTurnResponseSchema,
  feedbackReportResponseSchema,
  dashboardResponseSchema,
  sessionStatusResponseSchema,
  turnChunkSchema,
  interviewSessionSchema,
  interviewQuestionSchema,
  feedbackReportSchema,
} from '@/lib/schemas';
import {
  mockSession,
  mockQuestions,
  mockFeedbackReport,
  mockJdParseResponse,
  mockSessionTurnResponse,
  mockFeedbackReportResponse,
  mockDashboardResponse,
  mockSessionId,
} from '@/lib/mock';
import { jdService } from '@/lib/services/jdService';
import { sessionService } from '@/lib/services/sessionService';
import { feedbackService } from '@/lib/services/feedbackService';

// ---------------------------------------------------------------------------
// Fixtures satisfy Zod schemas
// ---------------------------------------------------------------------------
describe('Mock fixtures validate against Zod schemas', () => {
  it('mockSession satisfies interviewSessionSchema', () => {
    const result = interviewSessionSchema.safeParse(mockSession);
    expect(result.success).toBe(true);
  });

  it('mockQuestions satisfy interviewQuestionSchema', () => {
    for (const q of mockQuestions) {
      const result = interviewQuestionSchema.safeParse(q);
      expect(result.success).toBe(true);
    }
  });

  it('mockFeedbackReport satisfies feedbackReportSchema', () => {
    const result = feedbackReportSchema.safeParse(mockFeedbackReport);
    expect(result.success).toBe(true);
  });

  it('mockJdParseResponse satisfies jdParseResponseSchema', () => {
    const result = jdParseResponseSchema.safeParse(mockJdParseResponse);
    expect(result.success).toBe(true);
  });

  it('mockSessionTurnResponse satisfies sessionTurnResponseSchema', () => {
    const result = sessionTurnResponseSchema.safeParse(mockSessionTurnResponse);
    expect(result.success).toBe(true);
  });

  it('mockFeedbackReportResponse satisfies feedbackReportResponseSchema', () => {
    const result = feedbackReportResponseSchema.safeParse(mockFeedbackReportResponse);
    expect(result.success).toBe(true);
  });

  it('mockDashboardResponse satisfies dashboardResponseSchema', () => {
    const result = dashboardResponseSchema.safeParse(mockDashboardResponse);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Service contract tests with mock implementations
// ---------------------------------------------------------------------------
describe('jdService (mock)', () => {
  it('parse returns a valid JdParseResponse', async () => {
    const result = await jdService.parse('user_1', 'Some JD text', 'paste');
    const validated = jdParseResponseSchema.safeParse(result);
    expect(validated.success).toBe(true);
  });

  it('parse returns parsed signals with expected fields', async () => {
    const result = await jdService.parse('user_1', 'Some JD text', 'preset');
    expect(result.parsedSignals.role).toBeDefined();
    expect(result.parsedSignals.stack.length).toBeGreaterThan(0);
    expect(result.estimatedMinutes).toBeGreaterThan(0);
  });
});

describe('sessionService (mock)', () => {
  it('start returns the first question', async () => {
    const result = await sessionService.start('user_1', mockSessionId);
    const validated = sessionTurnResponseSchema.safeParse(result);
    expect(validated.success).toBe(true);
    expect(result.questionOrder).toBe(0);
  });

  it('processTurn advances through questions', async () => {
    await sessionService.start('user_1', 'session_adv');
    const turn1 = await sessionService.processTurn('user_1', 'session_adv', 'My answer');
    expect(turn1.questionOrder).toBe(1);

    const validated = sessionTurnResponseSchema.safeParse(turn1);
    expect(validated.success).toBe(true);
  });

  it('processTurnStream yields valid TurnChunks', async () => {
    await sessionService.start('user_1', 'session_stream');
    const chunks: unknown[] = [];
    for await (const chunk of sessionService.processTurnStream('user_1', 'session_stream', 'My answer')) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      const validated = turnChunkSchema.safeParse(chunk);
      expect(validated.success).toBe(true);
    }
  });

  it('getStatus returns valid SessionStatusResponse', async () => {
    await sessionService.start('user_1', 'session_status');
    const status = await sessionService.getStatus('user_1', 'session_status');
    const validated = sessionStatusResponseSchema.safeParse(status);
    expect(validated.success).toBe(true);
    expect(status.sessionId).toBe('session_status');
  });

  it('end cleans up session state', async () => {
    await sessionService.start('user_1', 'session_end');
    await sessionService.end('user_1', 'session_end');
    // After end, starting again should reset to question 0
    const result = await sessionService.start('user_1', 'session_end');
    expect(result.questionOrder).toBe(0);
  });
});

describe('feedbackService (mock)', () => {
  it('generateReport returns a valid FeedbackReportResponse', async () => {
    const result = await feedbackService.generateReport('user_1', mockSessionId);
    const validated = feedbackReportResponseSchema.safeParse(result);
    expect(validated.success).toBe(true);
  });

  it('generateReport uses the provided sessionId', async () => {
    const result = await feedbackService.generateReport('user_1', 'custom_session_id');
    expect(result.sessionId).toBe('custom_session_id');
  });

  it('generateReport includes per-question breakdown', async () => {
    const result = await feedbackService.generateReport('user_1', mockSessionId);
    expect(result.questions.length).toBeGreaterThan(0);
    expect(result.questions[0].scores).toBeDefined();
  });

  it('getDashboard returns a valid DashboardResponse', async () => {
    const result = await feedbackService.getDashboard('user_1');
    const validated = dashboardResponseSchema.safeParse(result);
    expect(validated.success).toBe(true);
  });

  it('getDashboard includes session history', async () => {
    const result = await feedbackService.getDashboard('user_1');
    expect(result.sessions.length).toBeGreaterThan(0);
    expect(result.totalSessions).toBe(result.sessions.length);
  });
});
