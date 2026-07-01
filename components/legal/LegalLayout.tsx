import type { ReactNode } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { ArrowIcon, ShieldIcon } from '@/components/landing/icons';
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

          <div className={styles.notice}>
            <ShieldIcon />
            <p>
              <strong>Plain-language heads-up:</strong> this document is a general template, not
              legal advice. Items in <span className={styles.placeholder}>amber</span> are
              placeholders you must replace, and you should have a qualified attorney review it for
              your jurisdiction before relying on it.
            </p>
          </div>

          <div className={styles.prose}>{children}</div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

export { styles as legalStyles };
