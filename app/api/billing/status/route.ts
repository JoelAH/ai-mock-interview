import { auth } from '@clerk/nextjs/server';
import { userRepository } from '@/lib/repositories';
import { dbConnect } from '@/lib/db';

/**
 * GET /api/billing/status
 *
 * Returns the current user's subscription tier and status.
 * Used by the post-checkout polling page to detect when the
 * webhook has synced the subscription.
 */
export async function GET() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const user = await userRepository.findByClerkId(clerkUserId);

  if (!user) {
    return Response.json({ tier: 'free', status: 'none' }, { status: 200 });
  }

  return Response.json(
    {
      tier: user.subscriptionTier ?? 'free',
      status: user.subscriptionStatus ?? 'none',
    },
    { status: 200 },
  );
}
