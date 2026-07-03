/**
 * Unit tests for Task 15: Deepgram scoped token minting + route handler.
 *
 * Covers:
 * 1. mintScopedToken() — mock mode returns fake token
 * 2. mintScopedToken() — real mode with mocked fetch (success + error cases)
 * 3. POST /api/deepgram/token route handler (auth, response shape)
 */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { mintScopedToken } from '@/lib/integrations/deepgram';

// Mock Clerk for route handler tests
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// ---------------------------------------------------------------------------
// mintScopedToken — mock mode (USE_MOCKS=true, default in tests)
// ---------------------------------------------------------------------------
describe('mintScopedToken — mock mode', () => {
  it('returns a mock token without hitting Deepgram', async () => {
    const result = await mintScopedToken();

    expect(result.token).toBe('mock-deepgram-token-dev');
    expect(result.url).toContain('mock.deepgram.local');
    expect(result.expiresAt).toBeDefined();

    // expiresAt should be in the future
    const expiry = new Date(result.expiresAt).getTime();
    expect(expiry).toBeGreaterThan(Date.now());
  });

  it('returns a valid ISO date string for expiresAt', async () => {
    const result = await mintScopedToken();
    expect(() => new Date(result.expiresAt)).not.toThrow();
    expect(new Date(result.expiresAt).toISOString()).toBe(result.expiresAt);
  });
});

// ---------------------------------------------------------------------------
// mintScopedToken — real mode (mocked fetch)
// ---------------------------------------------------------------------------
describe('mintScopedToken — real mode', () => {
  const originalUseMocks = process.env.USE_MOCKS;
  const originalDeepgramKey = process.env.DEEPGRAM_API_KEY;

  beforeEach(() => {
    process.env.USE_MOCKS = 'false';
    process.env.DEEPGRAM_API_KEY = 'test-deepgram-key-123';
  });

  afterEach(() => {
    process.env.USE_MOCKS = originalUseMocks;
    process.env.DEEPGRAM_API_KEY = originalDeepgramKey;
    vi.restoreAllMocks();
  });

  it('calls Deepgram auth/grant and returns token data', async () => {
    const mockResponse = {
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-jwt-token',
      expires_in: 120,
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    const result = await mintScopedToken();

    // Verify fetch was called correctly
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.deepgram.com/v1/auth/grant',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Token test-deepgram-key-123',
          'Content-Type': 'application/json',
        }),
      }),
    );

    // Verify body contains ttl_seconds
    const callArgs = fetchSpy.mock.calls[0][1];
    const body = JSON.parse(callArgs!.body as string);
    expect(body.ttl_seconds).toBe(120);

    // Verify response shape
    expect(result.token).toBe(mockResponse.access_token);
    expect(result.url).toContain('wss://api.deepgram.com/v1/listen');
    expect(result.url).toContain('model=nova-3');
    expect(result.url).toContain('interim_results=true');
    expect(result.url).toContain('smart_format=true');
    expect(result.url).toContain('language=en');
    expect(result.expiresAt).toBeDefined();

    // expiresAt should be ~120s in the future
    const expiry = new Date(result.expiresAt).getTime();
    const expectedExpiry = Date.now() + 120 * 1000;
    expect(expiry).toBeGreaterThan(expectedExpiry - 5000);
    expect(expiry).toBeLessThan(expectedExpiry + 5000);
  });

  it('throws when Deepgram returns a non-200 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"err_code":"FORBIDDEN","err_msg":"Insufficient permissions."}', {
        status: 403,
      }),
    );

    await expect(mintScopedToken()).rejects.toThrow('Deepgram token grant failed (403)');
  });

  it('throws when response has no access_token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ expires_in: 30 }), { status: 200 }),
    );

    await expect(mintScopedToken()).rejects.toThrow('returned no access_token');
  });

  it('throws when DEEPGRAM_API_KEY is missing', async () => {
    delete process.env.DEEPGRAM_API_KEY;

    await expect(mintScopedToken()).rejects.toThrow('Missing required environment variable: DEEPGRAM_API_KEY');
  });
});

// ---------------------------------------------------------------------------
// POST /api/deepgram/token route handler
// ---------------------------------------------------------------------------
describe('POST /api/deepgram/token route handler', () => {
  let POST: () => Promise<Response>;

  beforeAll(async () => {
    const mod = await import('@/app/api/deepgram/token/route');
    POST = mod.POST;
  });

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: null });

    const response = await POST();
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 200 with token data when authenticated (mock mode)', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user_clerk_123' });

    const response = await POST();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.token).toBeDefined();
    expect(data.url).toBeDefined();
    expect(data.expiresAt).toBeDefined();
    expect(typeof data.token).toBe('string');
    expect(typeof data.url).toBe('string');
  });

  it('returns response matching DeepgramToken interface shape', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'user_clerk_456' });

    const response = await POST();
    const data = await response.json();

    // Should have exactly these three keys
    expect(Object.keys(data).sort()).toEqual(['expiresAt', 'token', 'url']);
  });
});
