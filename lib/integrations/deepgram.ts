/**
 * Deepgram integration — scoped token minting for browser STT.
 *
 * Framework-agnostic: no HTTP or Next.js imports.
 * In mock mode, returns a fake token that the client can use to
 * simulate the connection flow without hitting Deepgram's API.
 */
import { isMockMode, requireEnv } from '@/lib/env';

export interface DeepgramToken {
  /** Short-lived scoped token for browser WebSocket auth */
  token: string;
  /** WebSocket URL to connect to */
  url: string;
  /** Token expiry (ISO string) */
  expiresAt: string;
}

/**
 * Mints a short-lived scoped Deepgram token for the browser.
 * The raw DEEPGRAM_API_KEY never leaves the server.
 */
export async function mintScopedToken(): Promise<DeepgramToken> {
  if (isMockMode()) {
    return {
      token: 'mock-deepgram-token-dev',
      url: 'wss://mock.deepgram.local/v1/listen',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
  }

  // Real implementation (Task 15):
  // POST to Deepgram's /v1/keys endpoint with scoped permissions + TTL.
  const _apiKey = requireEnv('DEEPGRAM_API_KEY');
  throw new Error(
    'Real Deepgram token minting not yet implemented. Set USE_MOCKS=true or implement Task 15.',
  );
}
