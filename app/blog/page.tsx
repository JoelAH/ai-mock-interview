import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SITE } from '@/lib/site';
import styles from './blog.module.scss';

export const metadata: Metadata = {
  title: 'Blog',
  description: `Tips, strategies, and insights for software engineer interview prep — from the maker of ${SITE.name}.`,
  alternates: { canonical: '/blog' },
};

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'why-practicing-interviews-out-loud-beats-studying',
    title: 'Why practicing interviews out loud beats studying silently',
    excerpt:
      'Reading answers in your head feels productive — until you freeze in the real room. Here is why speaking your answers changes everything.',
    date: 'July 8, 2026',
  },
  {
    slug: 'how-to-prepare-for-system-design-interview',
    title: 'How to prepare for a system design interview in 2026',
    excerpt:
      'System design rounds trip up even senior engineers. A structured approach to preparation that covers scope, tradeoffs, and communication.',
    date: 'July 8, 2026',
  },
  {
    slug: 'common-behavioral-interview-mistakes-engineers-make',
    title: 'The most common behavioral interview mistakes engineers make',
    excerpt:
      'Technical people tend to under-invest in behavioral prep. These are the patterns that cost offers — and how to fix them.',
    date: 'July 8, 2026',
  },
];

export default function BlogPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className={styles.page}>
        <div className={styles.container}>
          <span className={styles.eyebrow}>Blog</span>
          <h1 className={styles.title}>Interview prep, unpacked.</h1>
          <p className={styles.subtitle}>
            Practical advice for software engineers who want to show up sharp on interview day.
          </p>

          <div className={styles.articleList}>
            {BLOG_POSTS.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className={styles.articleCard}
              >
                <p className={styles.articleDate}>{post.date}</p>
                <h2 className={styles.articleTitle}>{post.title}</h2>
                <p className={styles.articleExcerpt}>{post.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
