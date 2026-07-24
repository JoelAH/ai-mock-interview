import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { feedbackService } from '@/lib/services';
import { authService } from '@/lib/services';

/**
 * GET /api/dashboard
 *
 * Returns the authenticated user's dashboard data: session history,
 * total sessions count, and average score.
 *
 * Used by the desktop Electron app (and potentially any client-side dashboard).
 */
export async function GET() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const internalUser = await authService.resolveUser(clerkUserId);

  if (!internalUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const dashboard = await feedbackService.getDashboard(
    internalUser._id.toString(),
  );

  return NextResponse.json(dashboard);
}
