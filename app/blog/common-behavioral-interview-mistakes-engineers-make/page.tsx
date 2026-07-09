import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { ArrowIcon } from '@/components/landing/icons';
import { SITE } from '@/lib/site';
import styles from '../blog.module.scss';

export const metadata: Metadata = {
  title: 'The most common behavioral interview mistakes engineers make',
  description:
    'Technical people tend to under-invest in behavioral prep. These are the patterns that cost software engineers offers — and practical ways to fix them before your next interview.',
  alternates: { canonical: '/blog/common-behavioral-interview-mistakes-engineers-make' },
  keywords: [
    'behavioral interview tips for engineers',
    'STAR method software engineer',
    'behavioral interview mistakes',
    'software engineer interview behavioral',
    'how to answer behavioral questions',
  ],
};

export default function Article() {
  return (
    <>
      <SiteHeader />
      <main id="main" className={styles.articlePage}>
        <article className={styles.articleContainer}>
          <Link href="/blog" className={styles.backLink}>
            <ArrowIcon /> All posts
          </Link>

          <header className={styles.articleHeader}>
            <div className={styles.articleMeta}>
              <span>July 8, 2026</span>
              <span>6 min read</span>
            </div>
            <h1 className={styles.articleHeaderTitle}>
              The most common behavioral interview mistakes engineers make
            </h1>
            <p className={styles.articleHeaderSub}>
              Technical people tend to under-invest in behavioral prep. These patterns cost offers.
            </p>
          </header>

          <div className={styles.prose}>
            <p>
              Most software engineers spend 90% of their prep time on coding and system design,
              and 10% on behavioral. Then they&apos;re surprised when the behavioral round is what
              tanks their scorecard. The irony is that behavioral questions are the most
              &ldquo;preparable&rdquo; part of the loop — if you know what mistakes to avoid.
            </p>

            <h2>Mistake 1: Answering in abstractions</h2>

            <p>
              Engineers love to generalize. When asked &ldquo;Tell me about a time you resolved a
              conflict on your team,&rdquo; they answer with how they &ldquo;usually&rdquo; handle
              conflict. The interviewer wants one specific story with names, dates, and outcomes —
              not a philosophy.
            </p>

            <p>
              <strong>Fix:</strong> Before the interview, prepare 5-7 specific stories from your
              career that cover common behavioral themes (leadership, conflict, failure, ambiguity,
              influence). Each story should have a concrete setup, your specific actions, and a
              measurable result.
            </p>

            <h2>Mistake 2: Burying the result</h2>

            <p>
              Many candidates spend three minutes on context and setup, then rush through the
              result in one sentence. But the result is what demonstrates impact. Without it, your
              story sounds like &ldquo;I did stuff, things happened.&rdquo;
            </p>

            <p>
              <strong>Fix:</strong> Practice giving the result early (even before the full story)
              as a hook, then fill in the details. Or ensure you budget at least 30% of your answer
              time for the outcome and what you learned.
            </p>

            <h2>Mistake 3: Not quantifying impact</h2>

            <p>
              &ldquo;I improved the system&rdquo; lands differently than &ldquo;I reduced API
              latency from 800ms to 120ms, which cut user drop-off by 15%.&rdquo; Numbers make
              stories credible and memorable.
            </p>

            <p>
              <strong>Fix:</strong> For each prepared story, identify at least one number — time
              saved, revenue generated, incidents prevented, percentage improvement. If you
              don&apos;t remember the exact number, a reasonable estimate with context
              (&ldquo;roughly 40% reduction&rdquo;) is still far better than no number at all.
            </p>

            <h2>Mistake 4: Taking too long to get to the point</h2>

            <p>
              Behavioral answers should be 2-3 minutes, not 5. Long, meandering answers signal
              poor communication skills — exactly the opposite of what the round is testing. If
              the interviewer has to interrupt you to move on, that&apos;s a signal.
            </p>

            <p>
              <strong>Fix:</strong> Practice with a timer. Record yourself. If your answer is over
              3 minutes, cut the setup. Most context can be delivered in 2-3 sentences. The
              interviewer will ask follow-ups if they want more detail.
            </p>

            <h2>Mistake 5: Only preparing &ldquo;success&rdquo; stories</h2>

            <p>
              &ldquo;Tell me about a time you failed&rdquo; is one of the most common behavioral
              questions, and candidates routinely fumble it. Either they give a fake failure
              (&ldquo;I worked too hard&rdquo;) or they share something so bad it raises concerns.
            </p>

            <p>
              <strong>Fix:</strong> Prepare one genuine failure where the stakes were real, you
              owned your part, and you learned something concrete that changed how you work. The
              interviewer is evaluating self-awareness and growth, not perfection.
            </p>

            <h2>Mistake 6: Not practicing out loud</h2>

            <p>
              This is the meta-mistake that enables all the others. You can write perfect STAR
              answers in a document, but if you&apos;ve never spoken them under pressure, they will
              come out differently in the room. You&apos;ll ramble, forget the key detail, or lose
              your thread.
            </p>

            <p>
              <strong>Fix:</strong> Speak every prepared answer out loud at least three times before
              the interview. Ideally to another person or an AI interviewer that can push back
              with follow-ups. The first time always feels rough. By the third, it flows.
            </p>

            <h2>The bottom line</h2>

            <p>
              Behavioral interviews are a communication test, not a character test. They reward
              preparation, structure, and practice — things engineers are already good at when they
              apply those skills to technical domains. The mistake is treating behavioral as
              something you can wing. You can&apos;t. But a few hours of targeted prep — especially
              spoken practice — goes further than most people expect.
            </p>
          </div>

          <div className={styles.cta}>
            <p className={styles.ctaText}>
              {SITE.name} asks behavioral questions tailored to your target role and pushes back
              when your answers lack specifics — so you fix these habits before the real thing.
            </p>
            <Link href="/sign-up" className={styles.ctaBtn}>
              Try it free
            </Link>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
