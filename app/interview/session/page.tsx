import type { Metadata } from 'next';
import InterviewSession from '@/components/interview/InterviewSession';

export const metadata: Metadata = {
  title: 'Interview Session',
  robots: { index: false, follow: false },
};

export default function InterviewSessionPage() {
  return <InterviewSession />;
}
