/**
 * Mock LLM adapter — returns deterministic fixture data without making
 * any network calls. Used when USE_MOCKS=true (dev/test).
 *
 * For structured output, it validates the fixture against the provided
 * Zod schema so you catch contract drift early.
 */
import type { z } from 'zod';
import type {
  LLMAdapter,
  CompletionOptions,
  StructuredOutputOptions,
  StreamCompletionOptions,
} from './types';

/**
 * A registry of mock responses keyed by schemaName.
 * Services register their fixtures here so the mock adapter can return
 * the right shape for each structured output call.
 */
const mockResponses = new Map<string, unknown>();

/**
 * Register a mock response for a given schemaName.
 * Call this from test setup or from lib/mock to pre-populate responses.
 */
export function registerMockLLMResponse(schemaName: string, data: unknown): void {
  mockResponses.set(schemaName, data);
}

/**
 * Clear all registered mock responses (useful between tests).
 */
export function clearMockLLMResponses(): void {
  mockResponses.clear();
}

export const mockLLMAdapter: LLMAdapter = {
  async generateCompletion(_options: CompletionOptions): Promise<string> {
    // Return a generic mock completion.
    // Services that need specific text should use generateStructuredOutput instead.
    return 'This is a mock LLM completion. Set USE_MOCKS=false and provide OPENAI_API_KEY for real responses.';
  },

  async generateStructuredOutput<T extends z.ZodType>(
    options: StructuredOutputOptions<T>,
  ): Promise<z.infer<T>> {
    const registered = mockResponses.get(options.schemaName);

    if (registered !== undefined) {
      // Validate against the schema to catch fixture/schema drift
      const result = options.schema.safeParse(registered);
      if (result.success) {
        return result.data;
      }
      throw new Error(
        `Mock LLM response for "${options.schemaName}" failed schema validation: ${JSON.stringify(result.error.issues)}`,
      );
    }

    // No registered mock — try to produce a default from the schema.
    // This is a best-effort fallback; prefer registering explicit fixtures.
    throw new Error(
      `No mock LLM response registered for schemaName="${options.schemaName}". ` +
        `Call registerMockLLMResponse("${options.schemaName}", data) in your mock setup.`,
    );
  },

  async *streamCompletion(_options: StreamCompletionOptions): AsyncIterable<string> {
    // Simulate streaming by yielding words with small pauses
    const words = 'This is a mock streamed response for development and testing purposes.'.split(' ');
    for (const word of words) {
      yield word + ' ';
    }
  },
};
