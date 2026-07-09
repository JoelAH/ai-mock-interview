import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { authService } from '@/lib/services';
import { TTS_TEXT_MAX_LENGTH } from '@/lib/config/limits';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/services/rateLimiter';
import { getTtsProvider } from '@/lib/integrations/tts';
import { getTtsProviderForTier } from '@/lib/config/tiers';
import type { SubscriptionTier } from '@/lib/config/tiers';

/**
 * POST /api/session/tts
 *
 * Converts text to speech audio using the TTS provider resolved from
 * the user's subscription tier. Streams raw audio bytes back to the client
 * so playback can begin before the full audio is generated.
 *
 * Request body: { text: string }
 * Response: binary audio stream (audio/mpeg or audio/opus depending on provider)
 *
 * The client calls this after receiving the question text from /api/session/turn,
 * piping the audio to a MediaSource or Audio element for immediate playback.
 */

const ttsRequestSchema = z.object({
  text: z.string().min(1, 'Text is required').max(TTS_TEXT_MAX_LENGTH, `Text must be under ${TTS_TEXT_MAX_LENGTH.toLocaleString()} characters`),
});

export async function POST(request: Request) {
  // 1. Authenticate
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await authService.resolveUser(clerkUserId);
  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 401 });
  }

  // Rate limit
  const rateLimited = await enforceRateLimit(RATE_LIMITS.sessionTts, clerkUserId);
  if (rateLimited) return rateLimited;

  // 2. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = ttsRequestSchema.safeParse(body);
  if (!validation.success) {
    return Response.json(
      { error: 'Validation failed', issues: validation.error.issues },
      { status: 400 },
    );
  }

  const { text } = validation.data;

  // 3. Resolve TTS provider from user's tier
  const tier = (user as { subscriptionTier?: string }).subscriptionTier as SubscriptionTier | undefined;
  const ttsProviderName = getTtsProviderForTier(tier);
  const ttsAdapter = getTtsProvider(ttsProviderName);

  // 4. Create a single-item async iterable from the text
  async function* textStream() {
    yield text;
  }

  // 5. Stream audio response
  const audioStream = ttsAdapter.streamTextToSpeech(textStream());

  // Determine content type based on provider
  const contentType = ttsProviderName === 'openai' ? 'audio/opus' : 'audio/mpeg';

  const encoder = { encode: (chunk: Uint8Array) => chunk };
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of audioStream) {
          controller.enqueue(chunk);
        }
        controller.close();
      } catch (err) {
        console.error('[POST /api/session/tts] Stream error:', err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Transfer-Encoding': 'chunked',
    },
  });
}
