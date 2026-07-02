'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { VoiceConsent, type ConsentResult } from './VoiceConsent';
import { AudioLevelMeter } from './AudioLevelMeter';
import { CheckIcon } from '@/components/landing/icons';
import styles from './interview.module.scss';

/**
 * Mic check screen — gates the interview on:
 * 1. Explicit voice-recording consent (VoiceConsent component)
 * 2. Confirmed working microphone (AudioLevelMeter detects audio)
 *
 * "Continue" is disabled until audio is detected.
 */
export function MicCheck() {
  const router = useRouter();
  const [consent, setConsent] = useState<ConsentResult | null>(null);
  const [audioDetected, setAudioDetected] = useState(false);

  const handleContinue = () => {
    // Navigate to the live interview session (Task 10 route)
    router.push('/interview/session');
  };

  return (
    <div className={styles.page}>
      <div className={styles.glow} />
      {consent ? (
        <div className={styles.card}>
          <span className={styles.statusTag}>
            <CheckIcon /> Consent recorded
          </span>
          <h1 className={styles.title}>Test your microphone</h1>
          <p className={styles.lede}>
            Say something to confirm your mic is working. Once we detect audio, you can continue to
            the interview.
          </p>

          <AudioLevelMeter onAudioDetected={() => setAudioDetected(true)} />

          <div className={styles.micActions}>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={!audioDetected}
              onClick={handleContinue}
              aria-label="Continue to interview"
            >
              {audioDetected ? (
                <>
                  <CheckIcon /> Continue
                </>
              ) : (
                'Waiting for audio...'
              )}
            </button>
          </div>

          <p className={styles.fine}>
            {consent.retainAudio
              ? 'Your audio will be saved so you can play it back after the session.'
              : 'Raw audio will be deleted once transcribed — only the transcript is kept.'}
          </p>
        </div>
      ) : (
        <VoiceConsent onConsent={setConsent} />
      )}
    </div>
  );
}
