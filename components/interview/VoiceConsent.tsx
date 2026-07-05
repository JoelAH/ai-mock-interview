'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { CheckIcon, Logo, MicIcon, ShieldIcon } from '@/components/landing/icons';
import { LEGAL, SITE } from '@/lib/site';
import styles from './interview.module.scss';

export type ConsentResult = {
  /** Wording version the user agreed to (see LEGAL.consentVersion). */
  version: string;
  /** ISO timestamp the consent was given. */
  at: string;
};

const STORAGE_KEY = 'sinterview.voiceConsent';

/**
 * Affirmative, unbundled microphone-recording consent gate. Required consent
 * (recording + processing) is separate from the optional audio-retention
 * consent so neither is forced — important for BIPA / wiretap / GDPR.
 *
 * NOTE: this records consent client-side only. When the live session loop is
 * built, also persist the returned ConsentResult server-side against the user.
 */
export function VoiceConsent({ onConsent }: { onConsent: (result: ConsentResult) => void }) {
  const [agree, setAgree] = useState(false);
  const agreeId = useId();

  function handleContinue() {
    if (!agree) return;
    const result: ConsentResult = {
      version: LEGAL.consentVersion,
      at: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    } catch {
      // Storage may be unavailable (private mode); consent still flows through.
    }
    onConsent(result);
  }

  return (
    <div className={styles.card}>
      <span className={styles.brand}>
        <Logo />
        <span>
          {SITE.name}
          <span className={styles.brandDot}>.</span>
        </span>
      </span>

      <span className={styles.eyebrow}>
        <span className={styles.dot} />
        Microphone &amp; recording
      </span>
      <h1 className={styles.title}>Before we go live</h1>
      <p className={styles.lede}>
        This is a spoken interview, so {SITE.name} needs to record and process your voice. Here is
        exactly what that means before you turn the mic on.
      </p>

      <ul className={styles.points}>
        <li className={styles.point}>
          <MicIcon />
          <span>
            We capture the audio of your answers and transcribe it to run the interview and score
            your responses.
          </span>
        </li>
        <li className={styles.point}>
          <ShieldIcon />
          <span>
            Audio and transcripts are processed by trusted third-party AI providers (speech-to-text,
            language, and voice).
          </span>
        </li>
        <li className={styles.point}>
          <CheckIcon />
          <span>
            Practice-only — your sessions stay private and are never shared with employers. You can
            stop and delete them anytime.
          </span>
        </li>
      </ul>

      <div className={styles.divider} />

      <div className={styles.consentList}>
        <label
          className={`${styles.consent}${agree ? ` ${styles.consentChecked}` : ''}`}
          htmlFor={agreeId}
        >
          <input
            id={agreeId}
            type="checkbox"
            className={styles.checkbox}
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
          />
          <span className={styles.consentBody}>
            I consent to {SITE.name} recording my microphone audio during this session and
            processing it and its transcript with third-party providers to deliver and score my mock
            interview.
            <span className={styles.required}>Required</span>
          </span>
        </label>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryBtn}
          disabled={!agree}
          onClick={handleContinue}
        >
          <MicIcon /> I agree — continue
        </button>
        <Link href="/dashboard" className={styles.textBtn}>
          Not now
        </Link>
      </div>

      <p className={styles.fine}>
        By continuing you agree to our <Link href="/terms">Terms</Link> and{' '}
        <Link href="/privacy">Privacy Policy</Link>. Some regions require explicit consent to record
        voice; you may withdraw consent at any time by ending the session.
      </p>
    </div>
  );
}
