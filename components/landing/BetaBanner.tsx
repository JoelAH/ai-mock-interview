'use client';

import { FormEvent, useState } from 'react';
import { trackBetaSignup } from '@/lib/analytics';
import styles from './beta-banner.module.scss';

export function BetaBanner() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('submitting');

    try {
      const res = await fetch('/api/beta/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) throw new Error('Request failed');

      trackBetaSignup();
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className={styles.banner}>
      <div className={styles.bannerInner}>
        <span className={styles.badge}>Coming Soon</span>
        <h2 className={styles.title}>We&rsquo;re getting ready for launch.</h2>
        <p className={styles.subtitle}>
          DevMockview is almost ready. Drop your email below and we&rsquo;ll let you know the moment
          you can start practicing.
        </p>

        {status === 'success' ? (
          <p className={styles.successMsg}>You&rsquo;re on the list. We&rsquo;ll be in touch.</p>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <label htmlFor="beta-email" className={styles.srOnly}>
              Email address
            </label>
            <input
              id="beta-email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              disabled={status === 'submitting'}
            />
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? 'Joining…' : 'Notify me'}
            </button>
          </form>
        )}

        {status === 'error' && (
          <p className={styles.errorMsg}>Something went wrong. Please try again.</p>
        )}
      </div>
    </div>
  );
}
