/**
 * Unit tests for Task 17: TTS adapters, factory, and route handler.
 *
 * Covers:
 * 1. Mock adapter — yields silent buffers, consumes text stream
 * 2. OpenAI adapter — mocked SDK client, streams audio bytes
 * 3. ElevenLabs adapter — mocked fetch, streams audio bytes
 * 4. Factory — resolves correct adapter per tier/provider
 * 5. POST /api/session/tts route handler — auth, validation, binary streaming
 */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { mockTtsAdapter } from '@/lib/integrations/tts/mock-adapter';
import { openaiTtsAdapter, _setTtsClientForTesting } from '@/lib/integrations/tts/openai-adapter';
import { elevenlabsTtsAdapter } from '@/lib/integrations/tts/elevenlabs-adapter';
import { deepgramTtsAdapter } from '@/lib/integrations/tts/deepgram-adapter';
import { getTtsProvider } from '@/lib/integrations/tts';

// Mock Clerk for route handler tests
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock authService to avoid DB dependency in route handler tests.
// The route handler imports from '@/lib/services' which re-exports authService.
const mockResolveUser = vi.fn();
vi.mock('@/lib/services/authService', () => ({
  authService: {
    resolveUser: mockResolveUser,
  },
}));

// ---------------------------------------------------------------------------
// Helper: collect all chunks from an async iterable
// ---------------------------------------------------------------------------
async function collectChunks(iterable: AsyncIterable<Uint8Array>): Promise<Uint8Array[]> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of iterable) {
    chunks.push(chunk);
  }
  return chunks;
}

/** Create a simple text async iterable from a string */
async function* textFromString(text: string): AsyncIterable<string> {
  yield text;
}

/** Create a multi-fragment text stream */
async function* textFragments(...fragments: string[]): AsyncIterable<string> {
  for (const f of fragments) {
    yield f;
  }
}

// ---------------------------------------------------------------------------
// Mock TTS adapter
// ---------------------------------------------------------------------------
describe('Mock TTS adapter', () => {
  it('yields one silent buffer per text fragment', async () => {
    const chunks = await collectChunks(
      mockTtsAdapter.streamTextToSpeech(textFragments('Hello', ' world', '!')),
    );
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toBeInstanceOf(Uint8Array);
    expect(chunks[0].length).toBe(1024);
  });

  it('yields nothing for empty text stream', async () => {
    async function* empty(): AsyncIterable<string> {}
    const chunks = await collectChunks(mockTtsAdapter.streamTextToSpeech(empty()));
    expect(chunks).toHaveLength(0);
  });

  it('has provider set to "mock"', () => {
    expect(mockTtsAdapter.provider).toBe('mock');
  });
});

// ---------------------------------------------------------------------------
// OpenAI TTS adapter (mocked client)
// ---------------------------------------------------------------------------
describe('OpenAI TTS adapter', () => {
  afterEach(() => {
    _setTtsClientForTesting(null);
    vi.restoreAllMocks();
  });

  it('has provider set to "openai"', () => {
    expect(openaiTtsAdapter.provider).toBe('openai');
  });

  it('buffers text and calls audio.speech.create with correct params', async () => {
    const fakeAudioBytes = new Uint8Array([0x01, 0x02, 0x03, 0x04]);

    // Create a mock readable stream that yields our fake audio
    const mockReadableStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(fakeAudioBytes);
        controller.close();
      },
    });

    const mockCreate = vi.fn().mockResolvedValue({
      body: mockReadableStream,
    });

    const mockClient = {
      audio: {
        speech: {
          create: mockCreate,
        },
      },
    };

    _setTtsClientForTesting(mockClient as unknown as import('openai').default);
    process.env.USE_MOCKS = 'false';
    process.env.OPENAI_API_KEY = 'test-key';

    const chunks = await collectChunks(
      openaiTtsAdapter.streamTextToSpeech(textFragments('Tell me about', ' your experience.')),
    );

    // Verify the SDK was called correctly
    expect(mockCreate).toHaveBeenCalledWith({
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      input: 'Tell me about your experience.',
      response_format: 'opus',
    });

    // Verify audio bytes were yielded
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual(fakeAudioBytes);

    process.env.USE_MOCKS = 'true';
  });

  it('yields nothing for empty text', async () => {
    process.env.USE_MOCKS = 'false';
    process.env.OPENAI_API_KEY = 'test-key';

    // Should not call create at all for empty text
    const mockCreate = vi.fn();
    _setTtsClientForTesting({
      audio: { speech: { create: mockCreate } },
    } as unknown as import('openai').default);

    const chunks = await collectChunks(
      openaiTtsAdapter.streamTextToSpeech(textFromString('   ')),
    );

    expect(chunks).toHaveLength(0);
    expect(mockCreate).not.toHaveBeenCalled();

    process.env.USE_MOCKS = 'true';
  });

  it('throws when response has no body', async () => {
    process.env.USE_MOCKS = 'false';
    process.env.OPENAI_API_KEY = 'test-key';

    _setTtsClientForTesting({
      audio: { speech: { create: vi.fn().mockResolvedValue({ body: null }) } },
    } as unknown as import('openai').default);

    await expect(async () => {
      await collectChunks(
        openaiTtsAdapter.streamTextToSpeech(textFromString('Hello')),
      );
    }).rejects.toThrow('no response body');

    process.env.USE_MOCKS = 'true';
  });

  it('uses custom voice when provided via options', async () => {
    const mockReadableStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([0x00]));
        controller.close();
      },
    });

    const mockCreate = vi.fn().mockResolvedValue({ body: mockReadableStream });
    _setTtsClientForTesting({
      audio: { speech: { create: mockCreate } },
    } as unknown as import('openai').default);

    process.env.USE_MOCKS = 'false';
    process.env.OPENAI_API_KEY = 'test-key';

    await collectChunks(
      openaiTtsAdapter.streamTextToSpeech(textFromString('Hello'), { voice: 'nova' }),
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ voice: 'nova' }),
    );

    process.env.USE_MOCKS = 'true';
  });
});

// ---------------------------------------------------------------------------
// ElevenLabs TTS adapter (mocked fetch)
// ---------------------------------------------------------------------------
describe('ElevenLabs TTS adapter', () => {
  const originalUseMocks = process.env.USE_MOCKS;
  const originalElevenLabsKey = process.env.ELEVENLABS_API_KEY;

  beforeEach(() => {
    process.env.USE_MOCKS = 'false';
    process.env.ELEVENLABS_API_KEY = 'test-elevenlabs-key';
  });

  afterEach(() => {
    process.env.USE_MOCKS = originalUseMocks;
    process.env.ELEVENLABS_API_KEY = originalElevenLabsKey;
    vi.restoreAllMocks();
  });

  it('has provider set to "elevenlabs"', () => {
    expect(elevenlabsTtsAdapter.provider).toBe('elevenlabs');
  });

  it('calls ElevenLabs streaming endpoint and yields audio bytes', async () => {
    const fakeAudioBytes = new Uint8Array([0xAA, 0xBB, 0xCC]);

    const mockReadableStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(fakeAudioBytes);
        controller.close();
      },
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(mockReadableStream, { status: 200 }),
    );

    const chunks = await collectChunks(
      elevenlabsTtsAdapter.streamTextToSpeech(textFromString('What are your strengths?')),
    );

    // Verify fetch was called correctly
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('api.elevenlabs.io/v1/text-to-speech/'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'xi-api-key': 'test-elevenlabs-key',
          'Content-Type': 'application/json',
        }),
      }),
    );

    // Verify body includes the text and model
    const callArgs = fetchSpy.mock.calls[0][1];
    const body = JSON.parse(callArgs!.body as string);
    expect(body.text).toBe('What are your strengths?');
    expect(body.model_id).toBe('eleven_flash_v2_5');

    // Verify audio was yielded
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual(fakeAudioBytes);
  });

  it('throws on non-200 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"detail":"invalid_api_key"}', { status: 401 }),
    );

    await expect(async () => {
      await collectChunks(
        elevenlabsTtsAdapter.streamTextToSpeech(textFromString('Hello')),
      );
    }).rejects.toThrow('ElevenLabs TTS failed (401)');
  });

  it('yields nothing for empty text', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const chunks = await collectChunks(
      elevenlabsTtsAdapter.streamTextToSpeech(textFromString('   ')),
    );

    expect(chunks).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('uses custom voice ID when provided', async () => {
    const mockReadableStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([0x00]));
        controller.close();
      },
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(mockReadableStream, { status: 200 }),
    );

    await collectChunks(
      elevenlabsTtsAdapter.streamTextToSpeech(textFromString('Hi'), { voice: 'custom_voice_123' }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/custom_voice_123/stream'),
      expect.anything(),
    );
  });
});

// ---------------------------------------------------------------------------
// Deepgram TTS adapter (mocked fetch)
// ---------------------------------------------------------------------------
describe('Deepgram TTS adapter', () => {
  const originalUseMocks = process.env.USE_MOCKS;
  const originalDeepgramKey = process.env.DEEPGRAM_API_KEY;

  beforeEach(() => {
    process.env.USE_MOCKS = 'false';
    process.env.DEEPGRAM_API_KEY = 'test-deepgram-key';
  });

  afterEach(() => {
    process.env.USE_MOCKS = originalUseMocks;
    process.env.DEEPGRAM_API_KEY = originalDeepgramKey;
    vi.restoreAllMocks();
  });

  it('has provider set to "deepgram"', () => {
    expect(deepgramTtsAdapter.provider).toBe('deepgram');
  });

  it('calls Deepgram /v1/speak endpoint and yields audio bytes', async () => {
    const fakeAudioBytes = new Uint8Array([0xDD, 0xEE, 0xFF]);

    const mockReadableStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(fakeAudioBytes);
        controller.close();
      },
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(mockReadableStream, { status: 200 }),
    );

    const chunks = await collectChunks(
      deepgramTtsAdapter.streamTextToSpeech(textFromString('Tell me about your experience.')),
    );

    // Verify fetch was called correctly
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('api.deepgram.com/v1/speak'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Token test-deepgram-key',
          'Content-Type': 'application/json',
        }),
      }),
    );

    // Verify URL contains the model
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('model=aura-2-pluto-en');

    // Verify body contains the text
    const callArgs = fetchSpy.mock.calls[0][1];
    const body = JSON.parse(callArgs!.body as string);
    expect(body.text).toBe('Tell me about your experience.');

    // Verify audio was yielded
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual(fakeAudioBytes);
  });

  it('throws on non-200 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"error":"unauthorized"}', { status: 401 }),
    );

    await expect(async () => {
      await collectChunks(
        deepgramTtsAdapter.streamTextToSpeech(textFromString('Hello')),
      );
    }).rejects.toThrow('Deepgram TTS failed (401)');
  });

  it('yields nothing for empty text', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const chunks = await collectChunks(
      deepgramTtsAdapter.streamTextToSpeech(textFromString('   ')),
    );

    expect(chunks).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('uses custom model/voice when provided', async () => {
    const mockReadableStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([0x00]));
        controller.close();
      },
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(mockReadableStream, { status: 200 }),
    );

    await collectChunks(
      deepgramTtsAdapter.streamTextToSpeech(textFromString('Hi'), { voice: 'aura-2-luna-en' }),
    );

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('model=aura-2-luna-en');
  });
});

// ---------------------------------------------------------------------------
// TTS Factory (getTtsProvider)
// ---------------------------------------------------------------------------
describe('getTtsProvider factory', () => {
  it('returns mock adapter when USE_MOCKS=true', () => {
    const adapter = getTtsProvider('deepgram');
    expect(adapter.provider).toBe('mock');
  });

  it('returns deepgram adapter when USE_MOCKS=false and provider is deepgram', () => {
    const original = process.env.USE_MOCKS;
    process.env.USE_MOCKS = 'false';

    const adapter = getTtsProvider('deepgram');
    expect(adapter.provider).toBe('deepgram');

    process.env.USE_MOCKS = original;
  });

  it('returns openai adapter when USE_MOCKS=false and provider is openai', () => {
    const original = process.env.USE_MOCKS;
    process.env.USE_MOCKS = 'false';

    const adapter = getTtsProvider('openai');
    expect(adapter.provider).toBe('openai');

    process.env.USE_MOCKS = original;
  });

  it('returns elevenlabs adapter when USE_MOCKS=false and provider is elevenlabs', () => {
    const original = process.env.USE_MOCKS;
    process.env.USE_MOCKS = 'false';

    const adapter = getTtsProvider('elevenlabs');
    expect(adapter.provider).toBe('elevenlabs');

    process.env.USE_MOCKS = original;
  });

  it('throws for unknown provider', () => {
    const original = process.env.USE_MOCKS;
    process.env.USE_MOCKS = 'false';

    expect(() => getTtsProvider('unknown' as any)).toThrow('Unknown TTS provider');

    process.env.USE_MOCKS = original;
  });
});

// ---------------------------------------------------------------------------
// POST /api/session/tts route handler
// ---------------------------------------------------------------------------
describe('POST /api/session/tts route handler', () => {
  let POST: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import('@/app/api/session/tts/route');
    POST = mod.POST;
  });

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: null });

    const request = new Request('http://localhost/api/session/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello world' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('returns 401 when user not found', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'clerk_tts_unknown' });

    mockResolveUser.mockResolvedValue(null);

    const request = new Request('http://localhost/api/session/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello world' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('returns 400 for empty text', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'clerk_tts_1' });

    mockResolveUser.mockResolvedValue({
      _id: 'fake_id',
      subscriptionTier: 'free',
    });

    const request = new Request('http://localhost/api/session/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 200 with audio content-type for valid request (mock mode)', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ userId: 'clerk_tts_2' });

    mockResolveUser.mockResolvedValue({
      _id: 'fake_id_2',
      subscriptionTier: 'starter',
    });

    const request = new Request('http://localhost/api/session/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Tell me about yourself.' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    // In mock mode, getTtsProvider returns mock adapter which yields silent buffers
    // Default tier is 'starter' which uses 'deepgram' → audio/mpeg
    expect(response.headers.get('Content-Type')).toBe('audio/mpeg');

    // Verify we got binary data back
    const buffer = await response.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});
