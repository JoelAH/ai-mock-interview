import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { sessionTurnRequestSchema, TRANSCRIPT_MAX_LENGTH } from '@/lib/schemas';
import { sessionService, authService, SessionOwnershipError } from '@/lib/services';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/services/rateLimiter';

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
 * Special case: when transcript is "__START__", initiates the session with
 * the opening question instead of processing a turn.
 *
 * Any client (web, mobile, desktop) can consume this stream identically
 * using a bearer token for auth.
 */

const turnRequestSchema = z.object({
  sessionId: z.string().min(1),
  transcript: z.string().min(1, 'Transcript cannot be empty').max(TRANSCRIPT_MAX_LENGTH, `Transcript must be under ${TRANSCRIPT_MAX_LENGTH.toLocaleString()} characters`),
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
  const rateLimited = await enforceRateLimit(RATE_LIMITS.sessionTurn, clerkUserId);
  if (rateLimited) return rateLimited;

  // 2. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = turnRequestSchema.safeParse(body);
  if (!validation.success) {
    return Response.json(
      { error: 'Validation failed', issues: validation.error.issues },
      { status: 400 },
    );
  }

  const { sessionId, transcript } = validation.data;
  const userId = user._id.toString();

  // 3. Handle session start vs normal turn
  if (transcript === '__START__') {
    // Start the session and return the opening question
    try {
      const result = await sessionService.start(userId, sessionId);
      const encoder = new TextEncoder();      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'decision', action: result.action })}\n\n`),
          );
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'question',
                text: result.questionText,
                questionType: result.questionType,
                isFollowUp: result.isFollowUp,
              })}\n\n`,
            ),
          );
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done', questionOrder: result.questionOrder })}\n\n`),
          );
          controller.close();
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
    } catch (err) {
      if (err instanceof SessionOwnershipError) {
        return Response.json({ error: 'Session not found' }, { status: 403 });
      }
      console.error('[POST /api/session/turn] Start error:', err);
      return Response.json({ error: 'Failed to start session' }, { status: 500 });
    }
  }

  // Handle session abandon
  if (transcript === '__ABANDON__') {
    try {
      await sessionService.abandon(userId, sessionId);
      return Response.json({ ok: true }, { status: 200 });
    } catch (err) {
      if (err instanceof SessionOwnershipError) {
        return Response.json({ error: 'Session not found' }, { status: 403 });
      }
      console.error('[POST /api/session/turn] Abandon error:', err);
      return Response.json({ error: 'Failed to abandon session' }, { status: 500 });
    }
  }

  // 4. Stream response as SSE for a normal turn
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
        if (err instanceof SessionOwnershipError) {
          const errorData = `data: ${JSON.stringify({ type: 'error', message: 'Session not found' })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
          return;
        }
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
