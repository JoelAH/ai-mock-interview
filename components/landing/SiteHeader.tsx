'use client';

import { useState } from 'react';
import { NAV_LINKS, SITE } from '@/lib/site';
import { ArrowIcon, Logo } from './icons';
import styles from './landing.module.scss';

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <a href="/" className={styles.brand} aria-label={`${SITE.name} home`}>
          <Logo />
          <span>
            {SITE.name}
            <span className={styles.brandDot}>.</span>
          </span>
        </a>

        <nav className={styles.nav} aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className={styles.headerCtas}>
          <a href="/sign-in" className={styles.signIn}>
            Sign in
          </a>
          <a href="/sign-up" className={`${styles.btn} ${styles.btnPrimary}`}>
            Start free <ArrowIcon />
          </a>
        </div>

        <button
          type="button"
          className={styles.menuBtn}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
          >
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      <div
        id="mobile-nav"
        className={`${styles.mobileNav}${open ? ` ${styles.mobileNavOpen}` : ''}`}
      >
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={styles.mobileLink}
            onClick={() => setOpen(false)}
          >
            {link.label}
          </a>
        ))}
        <div className={styles.mobileCtas}>
          <a href="/sign-in" className={`${styles.btn} ${styles.btnGhost} ${styles.btnBlock}`}>
            Sign in
          </a>
          <a href="/sign-up" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnBlock}`}>
            Start free <ArrowIcon />
          </a>
        </div>
      </div>
    </header>
  );
}
