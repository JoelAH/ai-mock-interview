/**
 * Unit tests for Task 14: JD parsing service + API route.
 *
 * Covers:
 * 1. jdService.parse() in mock mode (existing behavior preserved)
 * 2. jdService.parse() in "real" mode with mocked LLM + in-memory DB
 * 3. /api/jd/parse route handler (validation, auth, response shape)
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { z } from 'zod';
import { jdService } from '@/lib/services/jdService';
import {
  jdParseResponseSchema,
  jdParsingResultSchema,
  JD_PARSING_SCHEMA_NAME,
} from '@/lib/schemas';
import { registerMockLLMResponse, clearMockLLMResponses } from '@/lib/llm';
import { InterviewSession } from '@/lib/models';

// Mock Clerk's auth() and next/headers for route handler tests
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
  clearMockLLMResponses();
  vi.restoreAllMocks();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ---------------------------------------------------------------------------
// Fixture: what the LLM would return for a JD
// ---------------------------------------------------------------------------
const mockLLMParseResult = {
  role: 'Senior Backend Engineer',
  seniority: 'Senior (5+ years)',
  stack: ['TypeScript', 'Node.js', 'PostgreSQL', 'Kafka'],
  culture: ['ownership', 'remote-first', 'collaborative'],
  focusAreas: ['distributed systems', 'event-driven architecture', 'API design'],
  interviewType: 'mix' as const,
  estimatedMinutes: 25,
};

// ---------------------------------------------------------------------------
// jdService tests — mock mode (USE_MOCKS=true, the default in tests)
// ---------------------------------------------------------------------------
describe('jdService.parse() — mock mode', () => {
  it('returns a valid JdParseResponse without LLM or DB', async () => {
    const result = await jdService.parse('user_1', 'Some JD text', 'paste');
    const validated = jdParseResponseSchema.safeParse(result);
    expect(validated.success).toBe(true);
  });

  it('returns parsed signals with expected structure', async () => {
    const result = await jdService.parse('user_1', 'Any JD', 'preset');
    expect(result.parsedSignals.role).toBeDefined();
    expect(result.parsedSignals.stack.length).toBeGreaterThan(0);
    expect(result.estimatedMinutes).toBeGreaterThan(0);
    expect(result.sessionId).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// jdService tests — real mode (USE_MOCKS=false, mocked LLM, real DB)
// ---------------------------------------------------------------------------
describe('jdService.parse() — real mode with mocked LLM', () => {
  beforeEach(() => {
    // Force real mode for these tests
    process.env.USE_MOCKS = 'false';
    // Register the mock LLM response so the mock adapter returns structured data
    registerMockLLMResponse(JD_PARSING_SCHEMA_NAME, mockLLMParseResult);
    // But we're in USE_MOCKS=false... so the factory will try to use the real adapter.
    // To test the service logic without a real OpenAI key, we switch back to mock mode
    // for the LLM while keeping the service in "real" mode. The cleanest approach:
    // override USE_MOCKS back to true so the LLM factory returns the mock adapter,
    // but manually bypass the isMockMode() check in jdService by testing the logic directly.
    //
    // Instead, let's test with USE_MOCKS=true but register a specific LLM response
    // so we can verify the mock adapter path with schema validation.
    process.env.USE_MOCKS = 'true';
  });

  afterEach(() => {
    process.env.USE_MOCKS = 'true';
  });

  it('mock LLM response validates against jdParsingResultSchema', () => {
    const validated = jdParsingResultSchema.safeParse(mockLLMParseResult);
    expect(validated.success).toBe(true);
  });

  it('registered mock response is returned by mock adapter generateStructuredOutput', async () => {
    const { llm } = await import('@/lib/llm');
    registerMockLLMResponse(JD_PARSING_SCHEMA_NAME, mockLLMParseResult);

    const result = await llm.generateStructuredOutput({
      messages: [{ role: 'user', content: 'Parse this JD' }],
      schema: jdParsingResultSchema,
      schemaName: JD_PARSING_SCHEMA_NAME,
    });

    expect(result).toEqual(mockLLMParseResult);
  });
});

// ---------------------------------------------------------------------------
// jdService integration test — real path with monkey-patched mock mode off
// ---------------------------------------------------------------------------
describe('jdService.parse() — integration (bypassing mock mode)', () => {
  // To test the real code path we need to:
  // 1. Turn off mock mode so jdService enters the real branch
  // 2. But the LLM factory still uses mock adapter (since it checks isMockMode too)
  //
  // Solution: mock the LLM module to return our fixture, test service logic + DB write.

  beforeEach(() => {
    registerMockLLMResponse(JD_PARSING_SCHEMA_NAME, mockLLMParseResult);
  });

  it('calls LLM, persists session, and returns valid response when not mocked', async () => {
    // Temporarily disable mock mode
    const original = process.env.USE_MOCKS;
    process.env.USE_MOCKS = 'false';

    // We need the LLM to still work — register on the mock adapter and
    // override the LLM_PROVIDER to trigger the openai adapter.
    // Since we can't easily call OpenAI, we'll mock the entire llm module.
    const llmModule = await import('@/lib/llm');
    const generateSpy = vi.spyOn(llmModule.llm, 'generateStructuredOutput').mockResolvedValue(mockLLMParseResult);

    // Need a valid ObjectId for userId
    const userId = new mongoose.Types.ObjectId().toString();
    const jdText = 'Senior Backend Engineer at Acme Corp...';

    const result = await jdService.parse(userId, jdText, 'paste');

    // Verify LLM was called with the right schema name
    expect(generateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaName: JD_PARSING_SCHEMA_NAME,
        temperature: 0.2,
      }),
    );

    // Verify the LLM received the JD text in messages
    const callArgs = generateSpy.mock.calls[0][0];
    const userMessage = callArgs.messages.find((m) => m.role === 'user');
    expect(userMessage?.content).toBe(jdText);

    // Verify response shape
    const validated = jdParseResponseSchema.safeParse(result);
    expect(validated.success).toBe(true);

    // Verify parsed signals match LLM output
    expect(result.parsedSignals.role).toBe(mockLLMParseResult.role);
    expect(result.parsedSignals.seniority).toBe(mockLLMParseResult.seniority);
    expect(result.parsedSignals.stack).toEqual(mockLLMParseResult.stack);
    expect(result.parsedSignals.culture).toEqual(mockLLMParseResult.culture);
    expect(result.parsedSignals.focusAreas).toEqual(mockLLMParseResult.focusAreas);
    expect(result.interviewType).toBe(mockLLMParseResult.interviewType);
    expect(result.estimatedMinutes).toBe(mockLLMParseResult.estimatedMinutes);

    // Verify session was persisted in MongoDB
    const session = await InterviewSession.findById(result.sessionId).lean();
    expect(session).not.toBeNull();
    expect(session!.userId.toString()).toBe(userId);
    expect(session!.sourceType).toBe('paste');
    expect(session!.jdText).toBe(jdText);
    expect(session!.interviewType).toBe('mix');
    expect(session!.status).toBe('setup');
    expect(session!.parsedSignals).toEqual(expect.objectContaining({
      role: 'Senior Backend Engineer',
      stack: expect.arrayContaining(['TypeScript', 'Node.js']),
    }));

    // Restore
    process.env.USE_MOCKS = original;
    generateSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Route handler tests
// ---------------------------------------------------------------------------
describe('POST /api/jd/parse route handler', () => {
  let POST: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import('@/app/api/jd/parse/route');
    POST = mod.POST;
  });

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: null });

    const request = new Request('http://localhost/api/jd/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jdText: 'Some JD', sourceType: 'paste' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('returns 401 when user not found in DB', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'clerk_nonexistent' });

    const request = new Request('http://localhost/api/jd/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jdText: 'Some JD', sourceType: 'paste' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('User not found');
  });

  it('returns 400 for invalid JSON body', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'clerk_user_1' });

    // Create user in DB so auth passes
    const { userRepository } = await import('@/lib/repositories');
    await userRepository.upsertByClerkId('clerk_user_1', { email: 'test@test.com' });

    const request = new Request('http://localhost/api/jd/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json{{{',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid JSON body');
  });

  it('returns 400 for invalid request body (missing jdText)', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'clerk_user_2' });

    const { userRepository } = await import('@/lib/repositories');
    await userRepository.upsertByClerkId('clerk_user_2', { email: 'test2@test.com' });

    const request = new Request('http://localhost/api/jd/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceType: 'paste' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Validation failed');
    expect(data.issues).toBeDefined();
  });

  it('returns 400 for invalid sourceType', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'clerk_user_3' });

    const { userRepository } = await import('@/lib/repositories');
    await userRepository.upsertByClerkId('clerk_user_3', { email: 'test3@test.com' });

    const request = new Request('http://localhost/api/jd/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jdText: 'Some JD', sourceType: 'invalid' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 200 with valid JdParseResponse for valid request (mock mode)', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'clerk_user_4' });

    const { userRepository } = await import('@/lib/repositories');
    await userRepository.upsertByClerkId('clerk_user_4', { email: 'test4@test.com' });

    const request = new Request('http://localhost/api/jd/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jdText: 'Senior Software Engineer at BigCo...',
        sourceType: 'paste',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    const validated = jdParseResponseSchema.safeParse(data);
    expect(validated.success).toBe(true);
    expect(data.parsedSignals).toBeDefined();
    expect(data.interviewType).toBeDefined();
    expect(data.estimatedMinutes).toBeGreaterThan(0);
    expect(data.sessionId).toBeDefined();
  });
});
