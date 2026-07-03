/**
 * Unit tests for the LLM abstraction layer.
 *
 * Covers:
 * 1. OpenAI adapter — with a mocked OpenAI client (no network calls).
 * 2. Provider factory — resolves the correct adapter based on env.
 * 3. Mock adapter — deterministic responses + schema validation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import {
  llm,
  registerMockLLMResponse,
  clearMockLLMResponses,
} from '@/lib/llm';
import { openaiAdapter, _setClientForTesting } from '@/lib/llm/openai-adapter';
import { mockLLMAdapter } from '@/lib/llm/mock-adapter';

// ---------------------------------------------------------------------------
// Helpers: Mocked OpenAI client
// ---------------------------------------------------------------------------

function createMockOpenAIClient(overrides: {
  createResponse?: unknown;
  parseResponse?: unknown;
  streamChunks?: Array<{ choices: Array<{ delta: { content?: string } }> }>;
} = {}) {
  const { createResponse, parseResponse, streamChunks } = overrides;

  const mockCreate = vi.fn().mockResolvedValue(
    createResponse ?? {
      choices: [{ message: { content: 'Hello from OpenAI' } }],
    },
  );

  const mockParse = vi.fn().mockResolvedValue(
    parseResponse ?? {
      choices: [{ message: { parsed: { name: 'Test' }, refusal: null } }],
    },
  );

  // For streaming, return an async iterable
  const mockStreamCreate = vi.fn().mockResolvedValue(
    (async function* () {
      const chunks = streamChunks ?? [
        { choices: [{ delta: { content: 'Hello' } }] },
        { choices: [{ delta: { content: ' world' } }] },
        { choices: [{ delta: { content: '!' } }] },
      ];
      for (const chunk of chunks) {
        yield chunk;
      }
    })(),
  );

  return {
    chat: {
      completions: {
        create: vi.fn().mockImplementation((params) => {
          if (params.stream) {
            return mockStreamCreate(params);
          }
          return mockCreate(params);
        }),
        parse: mockParse,
      },
    },
    _mocks: { mockCreate, mockParse, mockStreamCreate },
  };
}

// ---------------------------------------------------------------------------
// OpenAI Adapter tests (with mocked client)
// ---------------------------------------------------------------------------
describe('OpenAI adapter', () => {
  let mockClient: ReturnType<typeof createMockOpenAIClient>;

  beforeEach(() => {
    mockClient = createMockOpenAIClient();
    // Inject the mock client into the adapter
    _setClientForTesting(mockClient as unknown as import('openai').default);
  });

  afterEach(() => {
    _setClientForTesting(null);
  });

  describe('generateCompletion', () => {
    it('returns the content from the first choice', async () => {
      const result = await openaiAdapter.generateCompletion({
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say hello' },
        ],
      });

      expect(result).toBe('Hello from OpenAI');
      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Say hello' },
          ],
          temperature: 0.7,
        }),
      );
    });

    it('uses custom model and temperature when provided', async () => {
      await openaiAdapter.generateCompletion({
        messages: [{ role: 'user', content: 'Hi' }],
        model: 'gpt-4o',
        temperature: 0.2,
        maxTokens: 500,
      });

      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          temperature: 0.2,
          max_tokens: 500,
        }),
      );
    });

    it('throws when response has no content', async () => {
      _setClientForTesting(
        createMockOpenAIClient({
          createResponse: { choices: [{ message: { content: null } }] },
        }) as unknown as import('openai').default,
      );

      await expect(
        openaiAdapter.generateCompletion({
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      ).rejects.toThrow('OpenAI returned an empty completion');
    });
  });

  describe('generateStructuredOutput', () => {
    const testSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    it('returns parsed structured output from the response', async () => {
      _setClientForTesting(
        createMockOpenAIClient({
          parseResponse: {
            choices: [{ message: { parsed: { name: 'Alice', age: 30 }, refusal: null } }],
          },
        }) as unknown as import('openai').default,
      );

      const result = await openaiAdapter.generateStructuredOutput({
        messages: [{ role: 'user', content: 'Give me info about Alice' }],
        schema: testSchema,
        schemaName: 'person_info',
      });

      expect(result).toEqual({ name: 'Alice', age: 30 });
    });

    it('uses lower default temperature (0.3) for structured output', async () => {
      _setClientForTesting(
        createMockOpenAIClient({
          parseResponse: {
            choices: [{ message: { parsed: { name: 'Bob', age: 25 }, refusal: null } }],
          },
        }) as unknown as import('openai').default,
      );

      await openaiAdapter.generateStructuredOutput({
        messages: [{ role: 'user', content: 'Info' }],
        schema: testSchema,
        schemaName: 'person_info',
      });

      // parse() is called on chat.completions.parse
      const client = createMockOpenAIClient({
        parseResponse: {
          choices: [{ message: { parsed: { name: 'Bob', age: 25 }, refusal: null } }],
        },
      });
      _setClientForTesting(client as unknown as import('openai').default);

      await openaiAdapter.generateStructuredOutput({
        messages: [{ role: 'user', content: 'Info' }],
        schema: testSchema,
        schemaName: 'person_info',
      });

      expect(client.chat.completions.parse).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.3,
        }),
      );
    });

    it('throws when the model refuses the request', async () => {
      _setClientForTesting(
        createMockOpenAIClient({
          parseResponse: {
            choices: [{ message: { parsed: null, refusal: 'I cannot do that.' } }],
          },
        }) as unknown as import('openai').default,
      );

      await expect(
        openaiAdapter.generateStructuredOutput({
          messages: [{ role: 'user', content: 'Do something bad' }],
          schema: testSchema,
          schemaName: 'person_info',
        }),
      ).rejects.toThrow('OpenAI refused the request: I cannot do that.');
    });

    it('throws when parsed is null and no refusal', async () => {
      _setClientForTesting(
        createMockOpenAIClient({
          parseResponse: {
            choices: [{ message: { parsed: null, refusal: null } }],
          },
        }) as unknown as import('openai').default,
      );

      await expect(
        openaiAdapter.generateStructuredOutput({
          messages: [{ role: 'user', content: 'Hmm' }],
          schema: testSchema,
          schemaName: 'person_info',
        }),
      ).rejects.toThrow('OpenAI returned no structured output');
    });
  });

  describe('streamCompletion', () => {
    it('yields text chunks from the stream', async () => {
      const chunks: string[] = [];
      for await (const chunk of openaiAdapter.streamCompletion({
        messages: [{ role: 'user', content: 'Stream something' }],
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', ' world', '!']);
    });

    it('skips chunks with no content delta', async () => {
      _setClientForTesting(
        createMockOpenAIClient({
          streamChunks: [
            { choices: [{ delta: { content: 'A' } }] },
            { choices: [{ delta: { content: undefined } }] },
            { choices: [{ delta: { content: 'B' } }] },
          ],
        }) as unknown as import('openai').default,
      );

      const chunks: string[] = [];
      for await (const chunk of openaiAdapter.streamCompletion({
        messages: [{ role: 'user', content: 'Go' }],
      })) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['A', 'B']);
    });

    it('passes stream: true to the create call', async () => {
      // Consume the stream to trigger the call
      for await (const _ of openaiAdapter.streamCompletion({
        messages: [{ role: 'user', content: 'Test' }],
      })) {
        // noop
      }

      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
        }),
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Provider factory tests
// ---------------------------------------------------------------------------
describe('LLM factory (llm proxy)', () => {
  it('resolves to mock adapter when USE_MOCKS=true', async () => {
    // vitest.setup.ts sets USE_MOCKS=true, so the factory should delegate to mockLLMAdapter
    const result = await llm.generateCompletion({
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result).toContain('mock LLM completion');
  });

  it('resolves to openai adapter when USE_MOCKS=false and LLM_PROVIDER=openai', async () => {
    const originalMocks = process.env.USE_MOCKS;
    const originalProvider = process.env.LLM_PROVIDER;

    process.env.USE_MOCKS = 'false';
    process.env.LLM_PROVIDER = 'openai';

    // Inject a mock client so we don't actually call OpenAI
    const client = createMockOpenAIClient();
    _setClientForTesting(client as unknown as import('openai').default);

    const result = await llm.generateCompletion({
      messages: [{ role: 'user', content: 'Hi' }],
    });

    expect(result).toBe('Hello from OpenAI');
    expect(client.chat.completions.create).toHaveBeenCalled();

    // Restore
    process.env.USE_MOCKS = originalMocks;
    process.env.LLM_PROVIDER = originalProvider;
    _setClientForTesting(null);
  });

  it('throws for unknown LLM_PROVIDER', () => {
    const originalMocks = process.env.USE_MOCKS;
    const originalProvider = process.env.LLM_PROVIDER;

    process.env.USE_MOCKS = 'false';
    process.env.LLM_PROVIDER = 'anthropic';

    expect(() => {
      // Triggering the resolution by calling generateCompletion
      // The factory throws synchronously when it can't find the provider
      llm.generateCompletion({
        messages: [{ role: 'user', content: 'Hi' }],
      });
    }).toThrow('Unknown LLM_PROVIDER: "anthropic"');

    // Restore
    process.env.USE_MOCKS = originalMocks;
    process.env.LLM_PROVIDER = originalProvider;
  });
});

// ---------------------------------------------------------------------------
// Mock adapter tests
// ---------------------------------------------------------------------------
describe('Mock LLM adapter', () => {
  afterEach(() => {
    clearMockLLMResponses();
  });

  describe('generateCompletion', () => {
    it('returns a static mock string', async () => {
      const result = await mockLLMAdapter.generateCompletion({
        messages: [{ role: 'user', content: 'anything' }],
      });
      expect(result).toContain('mock LLM completion');
    });
  });

  describe('generateStructuredOutput', () => {
    const schema = z.object({ title: z.string(), count: z.number() });

    it('returns registered mock data that passes schema validation', async () => {
      registerMockLLMResponse('test_schema', { title: 'Hello', count: 42 });

      const result = await mockLLMAdapter.generateStructuredOutput({
        messages: [{ role: 'user', content: 'Get data' }],
        schema,
        schemaName: 'test_schema',
      });

      expect(result).toEqual({ title: 'Hello', count: 42 });
    });

    it('throws when registered data fails schema validation', async () => {
      registerMockLLMResponse('bad_schema', { title: 123, count: 'not a number' });

      await expect(
        mockLLMAdapter.generateStructuredOutput({
          messages: [{ role: 'user', content: 'Get data' }],
          schema,
          schemaName: 'bad_schema',
        }),
      ).rejects.toThrow('failed schema validation');
    });

    it('throws when no mock response is registered for the schema name', async () => {
      await expect(
        mockLLMAdapter.generateStructuredOutput({
          messages: [{ role: 'user', content: 'Get data' }],
          schema,
          schemaName: 'unregistered',
        }),
      ).rejects.toThrow('No mock LLM response registered for schemaName="unregistered"');
    });
  });

  describe('streamCompletion', () => {
    it('yields multiple string chunks', async () => {
      const chunks: string[] = [];
      for await (const chunk of mockLLMAdapter.streamCompletion({
        messages: [{ role: 'user', content: 'Stream' }],
      })) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.join('')).toContain('mock streamed response');
    });
  });

  describe('clearMockLLMResponses', () => {
    it('clears all registered responses', async () => {
      const schema = z.object({ value: z.string() });
      registerMockLLMResponse('clear_test', { value: 'exists' });
      clearMockLLMResponses();

      await expect(
        mockLLMAdapter.generateStructuredOutput({
          messages: [{ role: 'user', content: 'x' }],
          schema,
          schemaName: 'clear_test',
        }),
      ).rejects.toThrow('No mock LLM response registered');
    });
  });
});
