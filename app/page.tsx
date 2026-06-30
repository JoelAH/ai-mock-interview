import { SiteHeader } from '@/components/landing/SiteHeader';
import { Hero } from '@/components/landing/Hero';
import { StatsStrip } from '@/components/landing/StatsStrip';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Features } from '@/components/landing/Features';
import { FeedbackShowcase } from '@/components/landing/FeedbackShowcase';
import { Pricing } from '@/components/landing/Pricing';
import { Faq } from '@/components/landing/Faq';
import { CtaBand } from '@/components/landing/CtaBand';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { JsonLd } from '@/components/landing/JsonLd';

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Hero />
        <StatsStrip />
        <HowItWorks />
        <Features />
        <FeedbackShowcase />
        <Pricing />
        <Faq />
        <CtaBand />
      </main>
      <SiteFooter />
      <JsonLd />
    </>
  );
}
