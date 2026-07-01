import type { Metadata } from 'next';
import { MicCheck } from '@/components/interview/MicCheck';

// App screen — keep it out of search results.
export const metadata: Metadata = {
  title: 'Mic check',
  robots: { index: false, follow: false },
};

export default function MicCheckPage() {
  return <MicCheck />;
}
