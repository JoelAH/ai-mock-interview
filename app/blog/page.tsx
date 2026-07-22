import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SITE } from '@/lib/site';
import { BLOG_POSTS } from '@/lib/blog';
import styles from './blog.module.scss';

export const metadata: Metadata = {
  title: 'Blog',
  description: `Tips, strategies, and insights for software engineer interview prep — from the maker of ${SITE.name}.`,
  alternates: { canonical: '/blog' },
};

// Re-exported for backwards compatibility with existing imports.
export { BLOG_POSTS };
export type { BlogPost } from '@/lib/blog';

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
