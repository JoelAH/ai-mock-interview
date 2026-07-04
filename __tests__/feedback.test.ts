/**
 * Unit tests for Task 18: Feedback scoring + report generation.
 *
 * Covers:
 * 1. feedbackService.scoreAnswer() — mocked LLM, persists scores to question
 * 2. feedbackService.generateReport() — mocked LLM, persists report + overallScore, response shape
 * 3. feedbackService.getDashboard() — reads from DB, computes average
 * 4. Scores never appear in live-session turn responses
 * 5. POST /api/session/feedback route handler — auth, validation, response
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { feedbackService } from '@/lib/services/feedbackService';
import { sessionRepository, questionRepository, feedbackRepository } from '@/lib/repositories';
import { InterviewSession, InterviewQuestion, FeedbackReport } from '@/lib/models';
import {
  feedbackReportResponseSchema,
  dashboardResponseSchema,
  ANSWER_SCORING_SCHEMA_NAME,
  REPORT_GENERATION_SCHEMA_NAME,
  type AnswerScoringResult,
  type ReportGenerationResult,
} from '@/lib/schemas';

// Mock Clerk for route handler tests
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  await mongoose.connect(uri);
});

afterEach(async () => {
  await mongoose.connection.dropDatabase();
  vi.restoreAllMocks();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockScoringResult: AnswerScoringResult = {
  relevance: 82,
  depth: 75,
  clarity: 88,
  strongAnswerNotes: 'Could include specific metrics and describe the business impact more clearly.',
};

const mockReportResult: ReportGenerationResult = {
  overallScore: 76,
  technicalAccuracyScore: 80,
  communicationScore: 78,
  structureScore: 70,
  diagnosis: 'Solid technical foundation with room to improve answer structure and conciseness.',
  synthesizedInsight:
    'Your technical depth is strong — focus on organizing answers with the STAR method and explicitly stating assumptions before diving into solutions.',
};

async function createTestSessionWithQuestions() {
  const userId = new mongoose.Types.ObjectId();
  const session = await InterviewSession.create({
    userId,
    sourceType: 'paste',
    jdText: 'Test JD',
    parsedSignals: {
      role: 'Senior Engineer',
      seniority: 'Senior',
      stack: ['TypeScript'],
      culture: ['collaborative'],
      focusAreas: ['distributed systems'],
    },
    interviewType: 'mix',
    status: 'completed',
    overallScore: null,
  });

  const sessionId = session._id.toString();

  const q1 = await InterviewQuestion.create({
    sessionId: session._id,
    text: 'Tell me about a distributed system you designed.',
    type: 'architectural',
    order: 0,
    isFollowUp: false,
    answerTranscript: 'I designed a Kafka-based event pipeline handling 50k messages per second.',
    scores: null,
    strongAnswerNotes: '',
  });

  const q2 = await InterviewQuestion.create({
    sessionId: session._id,
    text: 'How did you handle failures?',
    type: 'follow_up',
    order: 1,
    isFollowUp: true,
    answerTranscript: 'We used a dead-letter queue with exponential backoff retries.',
    scores: null,
    strongAnswerNotes: '',
  });

  return { userId: userId.toString(), sessionId, questionIds: [q1._id.toString(), q2._id.toString()] };
}

// ---------------------------------------------------------------------------
// feedbackService.scoreAnswer() tests
// ---------------------------------------------------------------------------
describe('feedbackService.scoreAnswer() — real mode', () => {
  beforeEach(() => {
    process.env.USE_MOCKS = 'false';
  });

  afterEach(() => {
    process.env.USE_MOCKS = 'true';
  });

  it('calls LLM and persists scores to the question', async () => {
    const { llm } = await import('@/lib/llm');
    const spy = vi.spyOn(llm, 'generateStructuredOutput').mockResolvedValue(mockScoringResult);

    const { sessionId, questionIds } = await createTestSessionWithQuestions();

    await feedbackService.scoreAnswer(
      sessionId,
      questionIds[0],
      'I designed a Kafka-based event pipeline handling 50k messages per second.',
    );

    // Verify LLM was called with the right schema
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaName: ANSWER_SCORING_SCHEMA_NAME,
        temperature: 0.2,
      }),
    );

    // Verify the question text is in the LLM messages
    const callArgs = spy.mock.calls[0][0];
    const userMsg = callArgs.messages.find((m) => m.role === 'user');
    expect(userMsg?.content).toContain('distributed system');
    expect(userMsg?.content).toContain('Kafka-based event pipeline');

    // Verify scores were persisted
    const updatedQ = await InterviewQuestion.findById(questionIds[0]).lean();
    expect(updatedQ!.scores).toEqual({
      relevance: 82,
      depth: 75,
      clarity: 88,
    });
    expect(updatedQ!.strongAnswerNotes).toBe(mockScoringResult.strongAnswerNotes);

    spy.mockRestore();
  });

  it('does nothing for empty transcript', async () => {
    const { llm } = await import('@/lib/llm');
    const spy = vi.spyOn(llm, 'generateStructuredOutput');

    const { sessionId, questionIds } = await createTestSessionWithQuestions();

    await feedbackService.scoreAnswer(sessionId, questionIds[0], '   ');

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// feedbackService.generateReport() tests
// ---------------------------------------------------------------------------
describe('feedbackService.generateReport() — real mode', () => {
  beforeEach(() => {
    process.env.USE_MOCKS = 'false';
  });

  afterEach(() => {
    process.env.USE_MOCKS = 'true';
  });

  it('generates a schema-valid report and persists it', async () => {
    const { llm } = await import('@/lib/llm');
    const spy = vi.spyOn(llm, 'generateStructuredOutput').mockResolvedValue(mockReportResult);

    const { userId, sessionId } = await createTestSessionWithQuestions();

    const report = await feedbackService.generateReport(userId, sessionId);

    // Verify response validates against the schema
    const validated = feedbackReportResponseSchema.safeParse(report);
    expect(validated.success).toBe(true);

    // Verify correct values
    expect(report.sessionId).toBe(sessionId);
    expect(report.overallScore).toBe(76);
    expect(report.technicalAccuracyScore).toBe(80);
    expect(report.communicationScore).toBe(78);
    expect(report.structureScore).toBe(70);
    expect(report.diagnosis).toBe(mockReportResult.diagnosis);
    expect(report.synthesizedInsight).toBe(mockReportResult.synthesizedInsight);

    // Verify per-question breakdown is included
    expect(report.questions).toHaveLength(2);
    expect(report.questions[0].text).toContain('distributed system');
    expect(report.questions[1].isFollowUp).toBe(true);

    spy.mockRestore();
  });

  it('persists feedback report to the database', async () => {
    const { llm } = await import('@/lib/llm');
    const spy = vi.spyOn(llm, 'generateStructuredOutput').mockResolvedValue(mockReportResult);

    const { userId, sessionId } = await createTestSessionWithQuestions();
    await feedbackService.generateReport(userId, sessionId);

    // Verify FeedbackReport was persisted
    const report = await FeedbackReport.findOne({ sessionId }).lean();
    expect(report).not.toBeNull();
    expect(report!.overallScore).toBe(76);
    expect(report!.synthesizedInsight).toBe(mockReportResult.synthesizedInsight);

    spy.mockRestore();
  });

  it('updates the session overallScore', async () => {
    const { llm } = await import('@/lib/llm');
    const spy = vi.spyOn(llm, 'generateStructuredOutput').mockResolvedValue(mockReportResult);

    const { userId, sessionId } = await createTestSessionWithQuestions();
    await feedbackService.generateReport(userId, sessionId);

    const session = await InterviewSession.findById(sessionId).lean();
    expect(session!.overallScore).toBe(76);

    spy.mockRestore();
  });

  it('calls LLM with full transcript (not just last answer)', async () => {
    const { llm } = await import('@/lib/llm');
    const spy = vi.spyOn(llm, 'generateStructuredOutput').mockResolvedValue(mockReportResult);

    const { userId, sessionId } = await createTestSessionWithQuestions();
    await feedbackService.generateReport(userId, sessionId);

    const callArgs = spy.mock.calls[0][0];
    const userMsg = callArgs.messages.find((m) => m.role === 'user');

    // Should contain both Q&A pairs
    expect(userMsg?.content).toContain('distributed system');
    expect(userMsg?.content).toContain('Kafka-based event pipeline');
    expect(userMsg?.content).toContain('failures');
    expect(userMsg?.content).toContain('dead-letter queue');

    spy.mockRestore();
  });

  it('throws when session has no questions', async () => {
    const { llm } = await import('@/lib/llm');
    vi.spyOn(llm, 'generateStructuredOutput');

    const userId = new mongoose.Types.ObjectId();
    const session = await InterviewSession.create({
      userId,
      sourceType: 'paste',
      interviewType: 'behavioral',
      status: 'completed',
    });

    await expect(
      feedbackService.generateReport(userId.toString(), session._id.toString()),
    ).rejects.toThrow('No questions found');
  });
});

// ---------------------------------------------------------------------------
// feedbackService.getDashboard() tests
// ---------------------------------------------------------------------------
describe('feedbackService.getDashboard() — real mode', () => {
  beforeEach(() => {
    process.env.USE_MOCKS = 'false';
  });

  afterEach(() => {
    process.env.USE_MOCKS = 'true';
  });

  it('returns sessions for the user with correct shape', async () => {
    const userId = new mongoose.Types.ObjectId();

    await InterviewSession.create({
      userId,
      sourceType: 'paste',
      interviewType: 'behavioral',
      status: 'completed',
      overallScore: 80,
      parsedSignals: { role: 'Engineer', seniority: 'Mid', stack: [], culture: [], focusAreas: [] },
    });

    await InterviewSession.create({
      userId,
      sourceType: 'preset',
      interviewType: 'architectural',
      status: 'completed',
      overallScore: 70,
      parsedSignals: { role: 'Architect', seniority: 'Senior', stack: [], culture: [], focusAreas: [] },
    });

    const result = await feedbackService.getDashboard(userId.toString());

    const validated = dashboardResponseSchema.safeParse(result);
    expect(validated.success).toBe(true);

    expect(result.totalSessions).toBe(2);
    expect(result.sessions).toHaveLength(2);
    expect(result.averageScore).toBe(75); // (80 + 70) / 2
  });

  it('returns null averageScore when no sessions are scored', async () => {
    const userId = new mongoose.Types.ObjectId();

    await InterviewSession.create({
      userId,
      sourceType: 'paste',
      interviewType: 'behavioral',
      status: 'setup',
      overallScore: null,
    });

    const result = await feedbackService.getDashboard(userId.toString());
    expect(result.averageScore).toBeNull();
    expect(result.totalSessions).toBe(1);
  });

  it('returns empty dashboard for user with no sessions', async () => {
    const userId = new mongoose.Types.ObjectId().toString();

    const result = await feedbackService.getDashboard(userId);
    expect(result.sessions).toHaveLength(0);
    expect(result.totalSessions).toBe(0);
    expect(result.averageScore).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Scores never appear in live-session responses
// ---------------------------------------------------------------------------
describe('Scores isolation — never surfaced mid-interview', () => {
  it('sessionService.processTurn response does not contain scores', async () => {
    // In mock mode, processTurn returns a SessionTurnResponse
    const { sessionService } = await import('@/lib/services/sessionService');
    await sessionService.start('user_1', 'scores_test_session');
    const result = await sessionService.processTurn('user_1', 'scores_test_session', 'My answer');

    // SessionTurnResponse should not have scores fields
    const resultKeys = Object.keys(result);
    expect(resultKeys).not.toContain('scores');
    expect(resultKeys).not.toContain('overallScore');
    expect(resultKeys).not.toContain('relevance');
    expect(resultKeys).not.toContain('depth');
    expect(resultKeys).not.toContain('clarity');
  });
});

// ---------------------------------------------------------------------------
// POST /api/session/feedback route handler
// ---------------------------------------------------------------------------
describe('POST /api/session/feedback route handler', () => {
  let POST: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import('@/app/api/session/feedback/route');
    POST = mod.POST;
  });

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: null });

    const request = new Request('http://localhost/api/session/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'abc' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('returns 400 for missing sessionId', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'clerk_fb_1' });

    const { userRepository } = await import('@/lib/repositories');
    await userRepository.upsertByClerkId('clerk_fb_1', { email: 'fb@test.com' });

    const request = new Request('http://localhost/api/session/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 200 with valid FeedbackReportResponse (mock mode)', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'clerk_fb_2' });

    const { userRepository } = await import('@/lib/repositories');
    await userRepository.upsertByClerkId('clerk_fb_2', { email: 'fb2@test.com' });

    const request = new Request('http://localhost/api/session/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'test_session_123' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    const validated = feedbackReportResponseSchema.safeParse(data);
    expect(validated.success).toBe(true);
    expect(data.sessionId).toBe('test_session_123');
  });
});
