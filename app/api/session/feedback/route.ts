import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { authService, feedbackService } from '@/lib/services';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/services/rateLimiter';

/**
 * POST /api/session/feedback
 *
 * Generates a feedback report for a completed interview session.
 * Thin route handler: authenticates, validates, delegates to feedbackService.
 *
 * Request body: { sessionId: string }
 * Response: FeedbackReportResponse (scores + per-question breakdown)
 */

const feedbackRequestSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
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
  const rateLimited = await enforceRateLimit(RATE_LIMITS.sessionFeedback, clerkUserId);
  if (rateLimited) return rateLimited;

  // 2. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = feedbackRequestSchema.safeParse(body);
  if (!validation.success) {
    return Response.json(
      { error: 'Validation failed', issues: validation.error.issues },
      { status: 400 },
    );
  }

  const { sessionId } = validation.data;
  const userId = user._id.toString();

  // 3. Delegate to service layer
  try {
    const report = await feedbackService.generateReport(userId, sessionId);
    return Response.json(report, { status: 200 });
  } catch (err) {
    if (err instanceof Error && err.message.includes('Access denied')) {
      return Response.json({ error: 'Session not found' }, { status: 403 });
    }
    console.error('[POST /api/session/feedback] Service error:', err);
    return Response.json(
      { error: 'Failed to generate feedback report' },
      { status: 500 },
    );
  }
}
