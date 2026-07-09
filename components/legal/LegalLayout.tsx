import type { ReactNode } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { ArrowIcon } from '@/components/landing/icons';
import { LEGAL } from '@/lib/site';
import styles from './legal.module.scss';

export function LegalLayout({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <article className={styles.wrap}>
          <Link href="/" className={styles.back}>
            <ArrowIcon /> Back to home
          </Link>

          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.meta}>Effective date: {LEGAL.effectiveDate}</p>

          <div className={styles.prose}>{children}</div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

export { styles as legalStyles };
