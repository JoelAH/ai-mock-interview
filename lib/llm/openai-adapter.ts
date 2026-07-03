/**
 * OpenAI LLM adapter — implements the provider-agnostic interface
 * using the OpenAI API (chat completions, structured output, streaming).
 *
 * This is a placeholder skeleton. The full implementation is wired in Task 13.
 * It exists now so the factory can reference it and the type system is satisfied.
 */
import type { z } from 'zod';
import type {
  LLMAdapter,
  CompletionOptions,
  StructuredOutputOptions,
  StreamCompletionOptions,
} from './types';

export const openaiAdapter: LLMAdapter = {
  async generateCompletion(_options: CompletionOptions): Promise<string> {
    // Task 13: implement using OpenAI SDK chat.completions.create()
    throw new Error(
      'OpenAI adapter not yet implemented. Set USE_MOCKS=true or implement Task 13.',
    );
  },

  async generateStructuredOutput<T extends z.ZodType>(
    _options: StructuredOutputOptions<T>,
  ): Promise<z.infer<T>> {
    // Task 13: implement using function calling / JSON mode
    throw new Error(
      'OpenAI adapter not yet implemented. Set USE_MOCKS=true or implement Task 13.',
    );
  },

  async *streamCompletion(_options: StreamCompletionOptions): AsyncIterable<string> {
    // Task 13: implement using stream: true on chat.completions.create()
    throw new Error(
      'OpenAI adapter not yet implemented. Set USE_MOCKS=true or implement Task 13.',
    );
  },
};
