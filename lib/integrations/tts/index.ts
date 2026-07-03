/**
 * TTS Layer — provider-agnostic entry point.
 *
 * Resolves the active adapter based on:
 * - USE_MOCKS=true → mock adapter (no network, deterministic)
 * - otherwise → the provider passed in (resolved per session from the
 *   user's subscription tier via lib/config/tiers.ts)
 *
 * Route handlers/services resolve the provider from the user's tier and
 * pass it to getTtsProvider — they never import a specific adapter directly.
 */
import { isMockMode } from '@/lib/env';
import type { TtsProvider } from '@/lib/config/tiers';
import { mockTtsAdapter } from './mock-adapter';
import { openaiTtsAdapter } from './openai-adapter';
import { elevenlabsTtsAdapter } from './elevenlabs-adapter';
import type { TtsAdapter } from './types';

export type { TtsAdapter, TtsOptions } from './types';

/**
 * Returns the TTS adapter for the given provider.
 * In mock mode, always returns the mock adapter regardless of provider,
 * so dev/test never hit a real TTS API.
 */
export function getTtsProvider(provider: TtsProvider): TtsAdapter {
  if (isMockMode()) {
    return mockTtsAdapter;
  }

  switch (provider) {
    case 'openai':
      return openaiTtsAdapter;
    case 'elevenlabs':
      return elevenlabsTtsAdapter;
    default:
      throw new Error(
        `Unknown TTS provider: "${provider}". Supported: openai, elevenlabs. ` +
          `Or set USE_MOCKS=true for development.`,
      );
  }
}
