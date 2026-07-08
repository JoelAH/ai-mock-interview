/**
 * Deepgram integration — scoped token minting for browser STT.
 *
 * Framework-agnostic: no HTTP or Next.js imports.
 * In mock mode, returns a fake token that the client can use to
 * simulate the connection flow without hitting Deepgram's API.
 *
 * Security: The raw DEEPGRAM_API_KEY never leaves the server.
 * The browser receives a short-lived JWT that only grants usage::write
 * (STT/TTS) and cannot access management APIs.
 */
import { isMockMode, requireEnv } from '@/lib/env';

export interface DeepgramToken {
  /** Short-lived scoped JWT for browser WebSocket auth */
  token: string;
  /** WebSocket URL to connect to (with model params) */
  url: string;
  /** Token expiry (ISO string) */
  expiresAt: string;
}

/** Default TTL for scoped tokens — 120 seconds gives the client time to connect. */
const TOKEN_TTL_SECONDS = 120;

/** Deepgram Nova-3 model — best accuracy + cheapest streaming. */
const DEEPGRAM_MODEL = 'nova-3';

/** Base WebSocket URL for Deepgram live transcription. */
const DEEPGRAM_WS_BASE = 'wss://api.deepgram.com/v1/listen';

/**
 * Builds the full WebSocket URL with query params for streaming STT.
 * The scoped JWT is NOT placed in the URL — Deepgram authenticates the
 * browser WebSocket via the Sec-WebSocket-Protocol subprotocol instead
 * (see useSTT: ['bearer', <jwt>]). Query-param token auth is not accepted.
 */
function buildListenUrl(): string {
  const params = new URLSearchParams({
    model: DEEPGRAM_MODEL,
    language: 'en',
    smart_format: 'true',
    interim_results: 'true',
    utterance_end_ms: '1500',
    vad_events: 'true',
    encoding: 'linear16',
    sample_rate: '16000',
  });
  return `${DEEPGRAM_WS_BASE}?${params.toString()}`;
}

/**
 * Mints a short-lived scoped Deepgram token for the browser.
 *
 * Calls POST https://api.deepgram.com/v1/auth/grant which returns a
 * temporary JWT with usage::write permission (STT + TTS only, no
 * management access). The token is valid for TOKEN_TTL_SECONDS.
 *
 * The API key used must have at least Member permissions for the grant
 * endpoint to succeed. If it fails, this function throws — the raw API
 * key is NEVER sent to the client.
 *
 * Once the browser uses this token to open a WebSocket, the connection
 * stays alive beyond the token's TTL — the token only needs to be valid
 * at the moment of connection.
 */
export async function mintScopedToken(): Promise<DeepgramToken> {
  if (isMockMode()) {
    return {
      token: 'mock-deepgram-token-dev',
      url: 'wss://mock.deepgram.local/v1/listen',
      expiresAt: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString(),
    };
  }

  const apiKey = requireEnv('DEEPGRAM_API_KEY');

  // Try the scoped grant endpoint first
  try {
    const response = await fetch('https://api.deepgram.com/v1/auth/grant', {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (response.ok) {
      const data = (await response.json()) as { access_token: string; expires_in: number };

      if (data.access_token) {
        return {
          token: data.access_token,
          url: buildListenUrl(),
          expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        };
      }
    }

    // Log the failure for debugging but don't throw
    const errorBody = await response.text().catch(() => '');
    console.warn(
      `[Deepgram] Token grant returned ${response.status}: ${errorBody}.`,
    );
  } catch (err) {
    console.warn('[Deepgram] Token grant request failed:', err);
  }

  // If we get here, the grant failed. Throw so the caller (API route) returns 500.
  // Never expose the raw API key to the client.
  throw new Error(
    'Deepgram token grant failed. Ensure DEEPGRAM_API_KEY has Member permissions. ' +
    'See: https://developers.deepgram.com/guides/fundamentals/token-based-authentication',
  );
}
