import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import FeedbackReport from '@/components/interview/FeedbackReport';
import { authService, feedbackService } from '@/lib/services';

export const metadata: Metadata = {
  title: 'Interview Feedback',
  robots: { index: false, follow: false },
};

interface FeedbackPageProps {
  searchParams: Promise<{ sessionId?: string }>;
}

export default async function FeedbackPage({ searchParams }: FeedbackPageProps) {
  const { sessionId } = await searchParams;
  const { userId: clerkUserId } = await auth();

  let report = null;
  if (sessionId && clerkUserId) {
    const user = await authService.resolveUser(clerkUserId);
    if (user) {
      try {
        report = await feedbackService.generateReport(
          user._id.toString(),
          sessionId,
        );
      } catch (err) {
        console.error('[FeedbackPage] Failed to generate report:', err);
      }
    }
  }

  return <FeedbackReport report={report} />;
}
