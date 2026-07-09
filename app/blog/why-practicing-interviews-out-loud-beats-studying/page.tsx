import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { ArrowIcon } from '@/components/landing/icons';
import { SITE } from '@/lib/site';
import styles from '../blog.module.scss';

export const metadata: Metadata = {
  title: 'Why practicing interviews out loud beats studying silently',
  description:
    'Reading answers in your head feels productive — until you freeze in the real room. Learn why speaking your answers out loud is the single highest-leverage interview prep habit for software engineers.',
  alternates: { canonical: '/blog/why-practicing-interviews-out-loud-beats-studying' },
  keywords: [
    'mock interview practice',
    'interview prep tips',
    'speaking practice for interviews',
    'software engineer interview tips',
    'how to stop freezing in interviews',
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
              <span>5 min read</span>
            </div>
            <h1 className={styles.articleHeaderTitle}>
              Why practicing interviews out loud beats studying silently
            </h1>
            <p className={styles.articleHeaderSub}>
              Reading answers in your head feels productive — until you freeze in the real room.
            </p>
          </header>

          <div className={styles.prose}>
            <p>
              You know the material. You&apos;ve read the blog posts, watched the YouTube
              breakdowns, maybe even written notes. But when the interviewer asks &ldquo;Tell me
              about a time you led a technical decision under ambiguity,&rdquo; your mind goes
              blank. The words that were so clear in your head come out jumbled or incomplete.
            </p>

            <p>
              This is not a knowledge problem. It&apos;s a retrieval-under-pressure problem — and
              the only way to fix it is to practice the way the real thing works: out loud.
            </p>

            <h2>The gap between knowing and articulating</h2>

            <p>
              Cognitive science calls it the &ldquo;illusion of competence.&rdquo; When you read an
              answer or review a concept, your brain registers familiarity. You feel confident
              because the material looks right. But recognition is not the same as recall, and
              recall is not the same as articulating clearly under time pressure with someone
              watching you.
            </p>

            <p>
              Speaking recruits different cognitive pathways than reading. You have to organize
              thoughts in real time, manage your pacing, choose words that land, and adjust when
              you notice the listener losing interest. None of that gets trained by reading
              flashcards.
            </p>

            <h2>Why silent prep creates a false sense of readiness</h2>

            <p>
              When you study silently, you get to skip the hard parts. You can skim over the
              transition between your setup and your result. You can ignore the part where you
              need to explain a tradeoff concisely. You can pretend you would remember the right
              numbers and timelines.
            </p>

            <p>
              The real interview does not let you skip anything. You either say it clearly or you
              don&apos;t. And the gap between those two states is enormous.
            </p>

            <h2>What speaking practice actually trains</h2>

            <ul>
              <li>
                <strong>Real-time organization.</strong> You learn to structure answers (situation,
                action, result) without needing to think about the framework.
              </li>
              <li>
                <strong>Conciseness.</strong> When you hear yourself rambling, you naturally learn
                to trim. Silent study never gives you that feedback signal.
              </li>
              <li>
                <strong>Recovery from blanks.</strong> Everyone loses their train of thought
                mid-answer sometimes. Practicing out loud teaches you how to bridge back gracefully.
              </li>
              <li>
                <strong>Pacing and confidence.</strong> The more times you hear yourself deliver a
                solid answer, the more your nervous system trusts that you can do it again.
              </li>
            </ul>

            <h2>The scheduling problem</h2>

            <p>
              The classic advice is &ldquo;do mock interviews with a friend.&rdquo; Great in
              theory. In practice, coordinating schedules with another engineer who has relevant
              experience and will give honest feedback is hard. Most people do one or two at best
              and then fall back on silent studying.
            </p>

            <p>
              That&apos;s why tools that let you practice speaking on your own schedule matter.
              You don&apos;t need a perfect simulation — you need reps. The goal is to hear
              yourself explain things until it feels automatic.
            </p>

            <h2>How to start</h2>

            <ol>
              <li>
                Pick three behavioral questions you expect to get (leadership, conflict,
                technical decision).
              </li>
              <li>
                Set a timer for 2 minutes per answer and speak your response out loud — no notes.
              </li>
              <li>
                Notice where you stumble. That&apos;s exactly where you&apos;d stumble in the real
                thing.
              </li>
              <li>
                Refine and repeat until the answer flows naturally. Then move to the next question.
              </li>
            </ol>

            <p>
              Ten spoken reps will do more for your confidence than ten hours of reading. The
              interview is a speaking test. Train for it that way.
            </p>
          </div>

          <div className={styles.cta}>
            <p className={styles.ctaText}>
              {SITE.name} lets you practice speaking your answers to an AI interviewer that pushes
              back and gives you a scored report.
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
