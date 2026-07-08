import { auth } from '@clerk/nextjs/server';
import { mintScopedToken } from '@/lib/integrations';

/**
 * POST /api/deepgram/token
 *
 * Mints a short-lived Deepgram scoped token for the authenticated user.
 * The browser uses this token to open a WebSocket directly to Deepgram
 * for streaming STT — the raw DEEPGRAM_API_KEY never reaches the client.
 *
 * Protected route: requires an authenticated Clerk session.
 */
export async function POST() {
  // 1. Authenticate
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Mint scoped token via the integration layer
  try {
    const tokenData = await mintScopedToken();
    return Response.json(tokenData, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/deepgram/token] Error minting token:', message);
    return Response.json(
      { error: 'Failed to generate transcription token', detail: message },
      { status: 500 },
    );
  }
}
