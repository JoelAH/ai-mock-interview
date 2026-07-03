/**
 * Centralized environment configuration.
 *
 * The USE_MOCKS flag controls whether services use mock data or call
 * real external APIs (LLM, STT, TTS, payments). This keeps dev/test
 * cheap and fast while sharing the exact same code paths.
 *
 * Rules:
 * - Tests always run with USE_MOCKS=true (set in vitest.setup.ts).
 * - Local dev defaults to true unless explicitly set to "false".
 * - Production MUST set USE_MOCKS=false (or omit it — see logic below).
 */

/**
 * Returns true when the app should use mock data instead of real
 * external services (LLM, Deepgram, ElevenLabs, Lemon Squeezy).
 *
 * Priority:
 * 1. If USE_MOCKS env var is explicitly "true" or "false", honor it.
 * 2. If NODE_ENV is "test", default to true.
 * 3. If NODE_ENV is "production", default to false.
 * 4. Otherwise (development), default to true.
 */
export function useMocks(): boolean {
  const explicit = process.env.USE_MOCKS;
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;

  const env = process.env.NODE_ENV;
  if (env === 'test') return true;
  if (env === 'production') return false;

  // Development: default to mocks so you don't burn API credits locally.
  return true;
}

/**
 * Quick boolean check — useful in service files:
 *   if (isMockMode()) return mockData;
 */
export const isMockMode = useMocks;

/**
 * Asserts that a required env var is set. Throws at startup if missing
 * and we're NOT in mock mode (mocks don't need real keys).
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value) return value;

  if (useMocks()) {
    // In mock mode, return an empty placeholder — the real SDK is never called.
    return '';
  }

  throw new Error(
    `Missing required environment variable: ${name}. ` +
      `Set it in .env.local or enable mock mode with USE_MOCKS=true.`,
  );
}
