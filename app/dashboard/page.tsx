import type { Metadata } from 'next';
import { currentUser } from '@clerk/nextjs/server';
import { auth } from '@clerk/nextjs/server';
import { Dashboard } from '@/components/dashboard';
import { feedbackService, billingService } from '@/lib/services';
import { authService } from '@/lib/services';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const [user, { userId: clerkUserId }] = await Promise.all([
    currentUser(),
    auth(),
  ]);

  // Resolve internal user and fetch dashboard + billing data
  let dashboardData = null;
  let allowance = null;
  if (clerkUserId) {
    const [internalUser, sessionAllowance] = await Promise.all([
      authService.resolveUser(clerkUserId),
      billingService.canCreateSession(clerkUserId),
    ]);

    allowance = sessionAllowance;

    if (internalUser) {
      dashboardData = await feedbackService.getDashboard(
        internalUser._id.toString(),
      );
    }
  }

  return (
    <Dashboard
      userName={user?.firstName ?? undefined}
      data={dashboardData}
      allowance={allowance}
    />
  );
}
