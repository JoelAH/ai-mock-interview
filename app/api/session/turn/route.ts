import { auth } from '@clerk/nextjs/server';
import { sessionTurnRequestSchema } from '@/lib/schemas';
import { sessionService, authService } from '@/lib/services';

/**
 * POST /api/session/turn
 *
 * Processes a single interview turn. Validates the JWT, parses the body,
 * calls sessionService.processTurnStream(), and pipes the async iterable
 * as Server-Sent Events (SSE) so the client receives chunks in real time.
 *
 * SSE format per chunk:
 *   data: {"type":"decision","action":"probe"}\n\n
 *   data: {"type":"question","text":"...","questionType":"behavioral","isFollowUp":true}\n\n
 *   data: {"type":"done","questionOrder":2}\n\n
 *
 * Any client (web, mobile, desktop) can consume this stream identically
 * using a bearer token for auth.
 */
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

  // 2. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = sessionTurnRequestSchema.safeParse(body);
  if (!validation.success) {
    return Response.json(
      { error: 'Validation failed', issues: validation.error.issues },
      { status: 400 },
    );
  }

  const { sessionId, transcript } = validation.data;
  const userId = user._id.toString();

  // 3. Stream response as SSE
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of sessionService.processTurnStream(userId, sessionId, transcript)) {
          const data = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
        controller.close();
      } catch (err) {
        console.error('[POST /api/session/turn] Stream error:', err);
        const errorData = `data: ${JSON.stringify({ type: 'error', message: 'Internal server error' })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
