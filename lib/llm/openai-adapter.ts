/**
 * OpenAI LLM adapter — implements the provider-agnostic interface
 * using the OpenAI SDK (chat completions, structured output via zodResponseFormat, streaming).
 *
 * No framework imports — usable from Next.js routes, Lambda, CLI, anywhere.
 * Keys stay server-side; requireEnv() returns a placeholder in mock mode
 * so this module can be safely imported even when the key is absent.
 */
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { z } from 'zod';
import type {
  LLMAdapter,
  CompletionOptions,
  StructuredOutputOptions,
  StreamCompletionOptions,
} from './types';
import { requireEnv } from '@/lib/env';

// ---------------------------------------------------------------------------
// Client singleton (lazy init to avoid import-time errors when key is missing)
// ---------------------------------------------------------------------------
let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: requireEnv('OPENAI_API_KEY'),
    });
  }
  return _client;
}

/** Exported for testing — allows injecting a mock OpenAI client. */
export function _setClientForTesting(client: OpenAI | null): void {
  _client = client;
}

// ---------------------------------------------------------------------------
// Default model configuration
// ---------------------------------------------------------------------------
const DEFAULT_MODEL = 'gpt-4o-mini';

// ---------------------------------------------------------------------------
// Adapter implementation
// ---------------------------------------------------------------------------
export const openaiAdapter: LLMAdapter = {
  /**
   * Generate a plain text completion using chat.completions.create().
   */
  async generateCompletion(options: CompletionOptions): Promise<string> {
    const client = getClient();

    const response = await client.chat.completions.create({
      model: options.model ?? DEFAULT_MODEL,
      messages: options.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty completion.');
    }
    return content;
  },

  /**
   * Generate structured JSON output validated against a Zod schema.
   * Uses the OpenAI SDK's beta .parse() method with zodResponseFormat.
   */
  async generateStructuredOutput<T extends z.ZodType>(
    options: StructuredOutputOptions<T>,
  ): Promise<z.infer<T>> {
    const client = getClient();

    const response = await client.chat.completions.parse({
      model: options.model ?? DEFAULT_MODEL,
      messages: options.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens,
      response_format: zodResponseFormat(options.schema, options.schemaName),
    });

    const parsed = response.choices[0]?.message?.parsed;
    if (parsed === null || parsed === undefined) {
      // Fallback: if the model refused or returned no parseable content
      const refusal = response.choices[0]?.message?.refusal;
      if (refusal) {
        throw new Error(`OpenAI refused the request: ${refusal}`);
      }
      throw new Error(
        'OpenAI returned no structured output. The response could not be parsed against the schema.',
      );
    }

    return parsed;
  },

  /**
   * Stream a completion as an async iterable of text chunks.
   * Yields each content delta as it arrives from the API.
   */
  async *streamCompletion(options: StreamCompletionOptions): AsyncIterable<string> {
    const client = getClient();

    const stream = await client.chat.completions.create({
      model: options.model ?? DEFAULT_MODEL,
      messages: options.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  },
};
