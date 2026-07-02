import type { Metadata } from 'next';
import JdInput from '@/components/interview/JdInput';

export const metadata: Metadata = {
  title: 'New Interview',
  description: 'Paste a job description or pick a role preset to start a tailored mock interview.',
};

export default function NewInterviewPage() {
  return <JdInput />;
}
