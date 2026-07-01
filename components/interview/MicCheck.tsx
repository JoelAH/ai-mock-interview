'use client';

import { useState } from 'react';
import { VoiceConsent, type ConsentResult } from './VoiceConsent';
import { CheckIcon } from '@/components/landing/icons';
import { Waveform } from '@/components/landing/Waveform';
import styles from './interview.module.scss';

/**
 * Step that gates the microphone check on explicit voice-recording consent.
 * Once consent is captured it hands off to the mic-check UI (level meter,
 * "Continue" gating on detected audio) — built out in a later step. For now it
 * confirms consent and shows where that UI lands.
 */
export function MicCheck() {
  const [consent, setConsent] = useState<ConsentResult | null>(null);

  return (
    <div className={styles.page}>
      <div className={styles.glow} />
      {consent ? (
        <div className={styles.card}>
          <span className={styles.statusTag}>
            <CheckIcon /> Consent recorded
          </span>
          <h1 className={styles.title}>You&rsquo;re set to test your mic</h1>
          <p className={styles.lede}>
            Thanks — we captured your consent
            {consent.retainAudio
              ? ' and will keep your audio so you can play it back.'
              : '. Raw audio will be deleted once it is transcribed.'}
          </p>

          <div className={styles.meterStub} aria-hidden="true">
            <Waveform bars={9} />
          </div>

          <p className={styles.note}>
            The live input-level meter and &ldquo;Continue&rdquo; check land here next. The captured
            consent is available to the session as a <code>ConsentResult</code> (version{' '}
            <code>{consent.version}</code>).
          </p>
        </div>
      ) : (
        <VoiceConsent onConsent={setConsent} />
      )}
    </div>
  );
}
