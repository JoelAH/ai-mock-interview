/**
 * Unit tests for Task 16: Interview orchestrator (real sessionService + route handler).
 *
 * Covers:
 * 1. sessionService.start() — LLM generates opening question, persists, transitions status
 * 2. sessionService.processTurn() — saves transcript, builds lean payload (no full JD),
 *    calls LLM for decision, persists new question, marks completed on 'end'
 * 3. sessionService.processTurnStream() — yields TurnChunks in correct order
 * 4. sessionService.getStatus() — reads from DB
 * 5. sessionService.end() — marks session completed
 * 6. POST /api/session/turn route handler — SSE streaming format
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { sessionService } from '@/lib/services/sessionService';
import { sessionRepository, questionRepository } from '@/lib/repositories';
import { InterviewSession, InterviewQuestion } from '@/lib/models';
import {
  sessionTurnResponseSchema,
  turnChunkSchema,
  ORCHESTRATOR_SCHEMA_NAME,
  type OrchestratorResult,
  type TurnChunk,
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

const mockOrchestratorResult: OrchestratorResult = {
  questionText: 'Tell me about a time you designed a distributed system. What tradeoffs did you face?',
  questionType: 'architectural',
  isFollowUp: false,
  action: 'advance',
  reasoning: 'Opening with a broad architectural question relevant to the role.',
};

const mockProbeResult: OrchestratorResult = {
  questionText: 'You mentioned eventual consistency — how did you handle data conflicts?',
  questionType: 'follow_up',
  isFollowUp: true,
  action: 'probe',
  reasoning: 'Answer was promising but shallow on conflict resolution.',
};

const mockEndResult: OrchestratorResult = {
  questionText: 'Great, I think we\'ve covered good ground. Any questions for me?',
  questionType: 'behavioral',
  isFollowUp: false,
  action: 'end',
  reasoning: 'Sufficient questions covered, candidate demonstrated senior-level thinking.',
};

async function createTestSession() {
  const userId = new mongoose.Types.ObjectId();
  const session = await InterviewSession.create({
    userId,
    sourceType: 'paste',
    jdText: 'Senior Backend Engineer role requiring distributed systems experience.',
    parsedSignals: {
      role: 'Senior Backend Engineer',
      seniority: 'Senior (5+ years)',
      stack: ['TypeScript', 'Node.js', 'Kafka'],
      culture: ['ownership', 'remote-first'],
      focusAreas: ['distributed systems', 'event-driven architecture'],
    },
    interviewType: 'architectural',
    status: 'setup',
    overallScore: null,
  });
  return { userId: userId.toString(), sessionId: session._id.toString() };
}

// ---------------------------------------------------------------------------
// sessionService.start() tests
// ---------------------------------------------------------------------------
describe('sessionService.start() — real mode', () => {
  beforeEach(() => {
    process.env.USE_MOCKS = 'false';
  });

  afterEach(() => {
    process.env.USE_MOCKS = 'true';
  });

  it('generates an opening question via LLM and persists it', async () => {
    const { llm } = await import('@/lib/llm');
    const spy = vi.spyOn(llm, 'generateStructuredOutput').mockResolvedValue(mockOrchestratorResult);

    const { userId, sessionId } = await createTestSession();
    const result = await sessionService.start(userId, sessionId);

    // Verify response shape
    const validated = sessionTurnResponseSchema.safeParse(result);
    expect(validated.success).toBe(true);
    expect(result.questionText).toBe(mockOrchestratorResult.questionText);
    expect(result.questionOrder).toBe(0);
    expect(result.action).toBe('advance');

    // Verify session status transitioned to in_progress
    const session = await InterviewSession.findById(sessionId).lean();
    expect(session!.status).toBe('in_progress');

    // Verify question was persisted
    const questions = await InterviewQuestion.find({ sessionId }).lean();
    expect(questions).toHaveLength(1);
    expect(questions[0].text).toBe(mockOrchestratorResult.questionText);
    expect(questions[0].order).toBe(0);

    spy.mockRestore();
  });

  it('passes lean context (no full JD text) to the LLM', async () => {
    const { llm } = await import('@/lib/llm');
    const spy = vi.spyOn(llm, 'generateStructuredOutput').mockResolvedValue(mockOrchestratorResult);

    const { userId, sessionId } = await createTestSession();
    await sessionService.start(userId, sessionId);

    // Inspect the messages sent to LLM
    const callArgs = spy.mock.calls[0][0];
    const allContent = callArgs.messages.map((m) => m.content).join(' ');

    // Should contain role/focus areas but NOT the full JD text
    expect(allContent).toContain('Senior Backend Engineer');
    expect(allContent).toContain('distributed systems');
    expect(allContent).not.toContain('Senior Backend Engineer role requiring distributed systems experience.');

    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// sessionService.processTurn() tests
// ---------------------------------------------------------------------------
describe('sessionService.processTurn() — real mode', () => {
  beforeEach(() => {
    process.env.USE_MOCKS = 'false';
  });

  afterEach(() => {
    process.env.USE_MOCKS = 'true';
  });

  it('saves the transcript, calls LLM, persists new question, returns response', async () => {
    const { llm } = await import('@/lib/llm');

    // First call for start(), second for processTurn()
    const spy = vi.spyOn(llm, 'generateStructuredOutput')
      .mockResolvedValueOnce(mockOrchestratorResult)
      .mockResolvedValueOnce(mockProbeResult);

    const { userId, sessionId } = await createTestSession();
    await sessionService.start(userId, sessionId);

    const transcript = 'I designed a notification pipeline using Kafka with eventual consistency.';
    const result = await sessionService.processTurn(userId, sessionId, transcript);

    // Verify response
    expect(result.questionText).toBe(mockProbeResult.questionText);
    expect(result.isFollowUp).toBe(true);
    expect(result.action).toBe('probe');
    expect(result.questionOrder).toBe(1);

    // Verify transcript was saved to the first question
    const questions = await InterviewQuestion.find({ sessionId }).sort({ order: 1 }).lean();
    expect(questions).toHaveLength(2);
    expect(questions[0].answerTranscript).toBe(transcript);
    expect(questions[1].text).toBe(mockProbeResult.questionText);
    expect(questions[1].isFollowUp).toBe(true);

    spy.mockRestore();
  });

  it('marks session as completed when LLM returns action=end', async () => {
    const { llm } = await import('@/lib/llm');
    const spy = vi.spyOn(llm, 'generateStructuredOutput')
      .mockResolvedValueOnce(mockOrchestratorResult) // start
      .mockResolvedValueOnce(mockEndResult); // processTurn → end

    const { userId, sessionId } = await createTestSession();
    await sessionService.start(userId, sessionId);

    const result = await sessionService.processTurn(userId, sessionId, 'My final answer.');
    expect(result.action).toBe('end');

    // Session should be marked completed
    const session = await InterviewSession.findById(sessionId).lean();
    expect(session!.status).toBe('completed');

    spy.mockRestore();
  });

  it('sends lean payload without full JD text to LLM', async () => {
    const { llm } = await import('@/lib/llm');
    const spy = vi.spyOn(llm, 'generateStructuredOutput')
      .mockResolvedValueOnce(mockOrchestratorResult)
      .mockResolvedValueOnce(mockProbeResult);

    const { userId, sessionId } = await createTestSession();
    await sessionService.start(userId, sessionId);
    await sessionService.processTurn(userId, sessionId, 'Some answer.');

    // Check the second LLM call (processTurn)
    const processTurnCall = spy.mock.calls[1][0];
    const allContent = processTurnCall.messages.map((m) => m.content).join(' ');

    // Should contain extracted signals but not the raw JD text
    expect(allContent).toContain('Senior Backend Engineer');
    expect(allContent).toContain('distributed systems');
    expect(allContent).not.toContain('Senior Backend Engineer role requiring distributed systems experience.');

    // Should contain the transcript in messages
    expect(allContent).toContain('Some answer.');

    spy.mockRestore();
  });

  it('includes conversation history in LLM messages', async () => {
    const { llm } = await import('@/lib/llm');
    const spy = vi.spyOn(llm, 'generateStructuredOutput')
      .mockResolvedValueOnce(mockOrchestratorResult) // start
      .mockResolvedValueOnce(mockProbeResult) // first turn
      .mockResolvedValueOnce(mockEndResult); // second turn

    const { userId, sessionId } = await createTestSession();
    await sessionService.start(userId, sessionId);
    await sessionService.processTurn(userId, sessionId, 'First answer about Kafka.');
    await sessionService.processTurn(userId, sessionId, 'Second answer about conflicts.');

    // Third call should include history of previous questions+answers
    const thirdCall = spy.mock.calls[2][0];
    const allContent = thirdCall.messages.map((m) => m.content).join(' ');

    expect(allContent).toContain(mockOrchestratorResult.questionText);
    expect(allContent).toContain('First answer about Kafka.');

    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// sessionService.processTurnStream() tests
// ---------------------------------------------------------------------------
describe('sessionService.processTurnStream() — real mode', () => {
  beforeEach(() => {
    process.env.USE_MOCKS = 'false';
  });

  afterEach(() => {
    process.env.USE_MOCKS = 'true';
  });

  it('yields decision, question, and done chunks in order', async () => {
    const { llm } = await import('@/lib/llm');
    const spy = vi.spyOn(llm, 'generateStructuredOutput')
      .mockResolvedValueOnce(mockOrchestratorResult) // start
      .mockResolvedValueOnce(mockProbeResult); // processTurnStream

    const { userId, sessionId } = await createTestSession();
    await sessionService.start(userId, sessionId);

    const chunks: TurnChunk[] = [];
    for await (const chunk of sessionService.processTurnStream(userId, sessionId, 'My answer.')) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(3);

    // First chunk: decision
    expect(chunks[0].type).toBe('decision');
    expect(chunks[0]).toEqual({ type: 'decision', action: 'probe' });

    // Second chunk: question
    expect(chunks[1].type).toBe('question');
    expect(chunks[1]).toEqual({
      type: 'question',
      text: mockProbeResult.questionText,
      questionType: mockProbeResult.questionType,
      isFollowUp: true,
    });

    // Third chunk: done
    expect(chunks[2].type).toBe('done');
    expect(chunks[2]).toEqual({ type: 'done', questionOrder: 1 });

    // All chunks validate against the schema
    for (const chunk of chunks) {
      const validated = turnChunkSchema.safeParse(chunk);
      expect(validated.success).toBe(true);
    }

    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// sessionService.getStatus() tests
// ---------------------------------------------------------------------------
describe('sessionService.getStatus() — real mode', () => {
  beforeEach(() => {
    process.env.USE_MOCKS = 'false';
  });

  afterEach(() => {
    process.env.USE_MOCKS = 'true';
  });

  it('returns correct status from DB', async () => {
    const { llm } = await import('@/lib/llm');
    const spy = vi.spyOn(llm, 'generateStructuredOutput').mockResolvedValue(mockOrchestratorResult);

    const { userId, sessionId } = await createTestSession();
    await sessionService.start(userId, sessionId);

    const status = await sessionService.getStatus(userId, sessionId);
    expect(status.sessionId).toBe(sessionId);
    expect(status.status).toBe('in_progress');
    expect(status.currentQuestionOrder).toBe(0);
    expect(status.totalQuestions).toBe(1);
    expect(status.interviewType).toBe('architectural');

    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// sessionService.end() tests
// ---------------------------------------------------------------------------
describe('sessionService.end() — real mode', () => {
  beforeEach(() => {
    process.env.USE_MOCKS = 'false';
  });

  afterEach(() => {
    process.env.USE_MOCKS = 'true';
  });

  it('marks session as completed', async () => {
    const { userId, sessionId } = await createTestSession();
    await sessionRepository.updateStatus(sessionId, 'in_progress');

    await sessionService.end(userId, sessionId);

    const session = await InterviewSession.findById(sessionId).lean();
    expect(session!.status).toBe('completed');
  });
});

// ---------------------------------------------------------------------------
// POST /api/session/turn route handler tests
// ---------------------------------------------------------------------------
describe('POST /api/session/turn route handler', () => {
  let POST: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import('@/app/api/session/turn/route');
    POST = mod.POST;
  });

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: null });

    const request = new Request('http://localhost/api/session/turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'abc', transcript: 'hello' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid body (missing transcript)', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'clerk_user_1' });

    const { userRepository } = await import('@/lib/repositories');
    await userRepository.upsertByClerkId('clerk_user_1', { email: 'test@test.com' });

    const request = new Request('http://localhost/api/session/turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'abc123' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns SSE stream with correct content-type for valid request (mock mode)', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'clerk_user_2' });

    const { userRepository } = await import('@/lib/repositories');
    await userRepository.upsertByClerkId('clerk_user_2', { email: 'test2@test.com' });

    // Create a session for the mock service to work with (mock mode doesn't need a real session)
    const request = new Request('http://localhost/api/session/turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'mock_session_1', transcript: 'My answer about systems.' }),
    });

    // Need to start the mock session first
    const { sessionService: svc } = await import('@/lib/services/sessionService');
    await svc.start('any', 'mock_session_1');

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');

    // Read the full stream
    const text = await response.text();
    const lines = text.split('\n').filter((l) => l.startsWith('data: '));

    expect(lines.length).toBe(3); // decision, question, done

    // Parse each SSE data line
    const chunks = lines.map((l) => JSON.parse(l.replace('data: ', '')));
    expect(chunks[0].type).toBe('decision');
    expect(chunks[1].type).toBe('question');
    expect(chunks[2].type).toBe('done');
  });
});
