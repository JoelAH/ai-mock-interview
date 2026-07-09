import { auth } from '@clerk/nextjs/server';
import { jdParseRequestSchema } from '@/lib/schemas';
import { jdService, authService, billingService } from '@/lib/services';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/services/rateLimiter';

/**
 * POST /api/jd/parse
 *
 * Thin route handler: validates the request body, resolves the authenticated
 * user, delegates to jdService.parse(), and serializes the response.
 * All business logic lives in the service layer.
 */
export async function POST(request: Request) {
  // 1. Authenticate — middleware already protects this route, but extract userId.
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Resolve internal user ID from Clerk ID.
  const user = await authService.resolveUser(clerkUserId);
  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 401 });
  }

  // 1b. Rate limit
  const rateLimited = await enforceRateLimit(RATE_LIMITS.jdParse, clerkUserId);
  if (rateLimited) return rateLimited;

  // 2. Enforce session cap — check billing allowance before creating anything.
  const allowance = await billingService.canCreateSession(clerkUserId);
  if (!allowance.allowed) {
    return Response.json(
      {
        error: 'Session limit reached',
        reason: allowance.reason,
        used: allowance.used,
        limit: allowance.limit,
      },
      { status: 403 },
    );
  }

  // 3. Parse and validate request body.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = jdParseRequestSchema.safeParse(body);
  if (!validation.success) {
    return Response.json(
      { error: 'Validation failed', issues: validation.error.issues },
      { status: 400 },
    );
  }

  const { jdText, sourceType } = validation.data;

  // 4. Delegate to service layer (pass internal MongoDB user ID).
  try {
    const result = await jdService.parse(user._id.toString(), jdText, sourceType);
    return Response.json(result, { status: 200 });
  } catch (err) {
    console.error('[POST /api/jd/parse] Service error:', err);
    return Response.json(
      { error: 'Failed to parse job description' },
      { status: 500 },
    );
  }
}
