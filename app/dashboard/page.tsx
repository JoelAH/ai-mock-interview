import type { Metadata } from 'next';
import { currentUser } from '@clerk/nextjs/server';
import { Dashboard } from '@/components/dashboard';

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const user = await currentUser();

  return <Dashboard userName={user?.firstName ?? undefined} />;
}
