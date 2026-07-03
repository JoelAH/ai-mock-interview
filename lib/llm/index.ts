/**
 * LLM Layer — provider-agnostic entry point.
 *
 * Factory resolves the active adapter based on environment:
 * - USE_MOCKS=true → mock adapter (no network, deterministic)
 * - USE_MOCKS=false → real adapter based on LLM_PROVIDER env var
 *
 * Services import from here — never from a specific adapter directly.
 */
export type {
  LLMAdapter,
  LLMMessage,
  LLMCallOptions,
  CompletionOptions,
  StructuredOutputOptions,
  StreamCompletionOptions,
} from './types';

export { registerMockLLMResponse, clearMockLLMResponses } from './mock-adapter';

import { isMockMode } from '@/lib/env';
import { mockLLMAdapter } from './mock-adapter';
import { openaiAdapter } from './openai-adapter';
import type { LLMAdapter } from './types';

/**
 * Resolves the LLM adapter for the current environment.
 * Called lazily on each invocation so env changes (e.g. in tests) are respected.
 */
function resolveAdapter(): LLMAdapter {
  if (isMockMode()) {
    return mockLLMAdapter;
  }

  const provider = process.env.LLM_PROVIDER ?? 'openai';

  switch (provider) {
    case 'openai':
      return openaiAdapter;
    default:
      throw new Error(
        `Unknown LLM_PROVIDER: "${provider}". Supported: openai. ` +
          `Or set USE_MOCKS=true for development.`,
      );
  }
}

/**
 * The LLM interface used by all services.
 * Delegates to the appropriate adapter based on USE_MOCKS and LLM_PROVIDER.
 */
export const llm: LLMAdapter = {
  generateCompletion(options) {
    return resolveAdapter().generateCompletion(options);
  },
  generateStructuredOutput(options) {
    return resolveAdapter().generateStructuredOutput(options);
  },
  streamCompletion(options) {
    return resolveAdapter().streamCompletion(options);
  },
};
