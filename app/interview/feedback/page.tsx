import type { Metadata } from 'next';
import FeedbackReport from '@/components/interview/FeedbackReport';

export const metadata: Metadata = {
  title: 'Interview Feedback',
  robots: { index: false, follow: false },
};

export default function FeedbackPage() {
  return <FeedbackReport />;
}
