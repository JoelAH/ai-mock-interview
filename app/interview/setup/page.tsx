import type { Metadata } from 'next';
import SetupReview from '@/components/interview/SetupReview';

export const metadata: Metadata = {
  title: 'Review Setup',
  description: 'Review parsed job description signals before starting your mock interview.',
};

export default function SetupReviewPage() {
  return <SetupReview />;
}
