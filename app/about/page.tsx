import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SITE } from '@/lib/site';
import styles from './about.module.scss';

export const metadata: Metadata = {
  title: 'About',
  description: `The story behind ${SITE.name} — built by an indie dev who kept freezing in real interviews.`,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className={styles.page}>
        <article className={styles.container}>
          <span className={styles.eyebrow}>About</span>
          <h1 className={styles.title}>
            Built by someone who kept freezing in interviews.
          </h1>

          <div className={styles.prose}>
            <p>
              Hey, I&apos;m Joey. I&apos;m a full-stack software engineer with over 10 years of
              experience working with US startups. I&apos;ve built products, shipped features, led
              projects. But interviews? They always tripped me up.
            </p>

            <p>
              I&apos;d know the material. I&apos;d prep for days. Then I&apos;d get in the room and
              freeze. Thoughts I&apos;d rehearsed would vanish the moment someone asked me to
              explain them out loud. It wasn&apos;t a knowledge problem — it was a
              speaking-under-pressure problem.
            </p>

            <p>
              The fix was obvious: practice talking through answers, not just reading about them. But
              I didn&apos;t have anyone technical to practice with. Peer mock interviews are hard to
              schedule, and most prep tools are just text boxes that test typing speed, not actual
              communication.
            </p>

            <p>
              So I built {SITE.name} — the tool I wished existed when I was preparing. A voice-first
              AI interviewer that listens to your answers, pushes back when you hand-wave, and tells
              you exactly what to fix. No scheduling. No judgment. Just reps until the real thing
              feels like one more practice round.
            </p>

            <p>
              This is an indie project. No VC money, no team of 50. Just me building something that
              solves a real problem I had — and that I think a lot of engineers share.
            </p>
          </div>

          <div className={styles.connect}>
            <h2 className={styles.connectTitle}>Connect</h2>
            <ul className={styles.links}>
              <li>
                <a
                  href="https://www.threads.net/@joey.the.coder"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Threads
                </a>
              </li>
              <li>
                <a
                  href="https://bsky.app/profile/joeythecoder.bsky.social"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Bluesky
                </a>
              </li>
              <li>
                <a href="mailto:admin@wimeki.com">Email</a>
              </li>
            </ul>
          </div>

          <div className={styles.cta}>
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
