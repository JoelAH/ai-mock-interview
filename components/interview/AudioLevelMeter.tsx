'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './interview.module.scss';

export type MicStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'error';

interface AudioLevelMeterProps {
  /** Called when audio above the threshold is detected */
  onAudioDetected?: () => void;
  /** Number of bars in the visual meter */
  bars?: number;
  /** RMS threshold (0–1) to consider as "audio detected" */
  threshold?: number;
}

/**
 * Live audio input level meter using the Web Audio API.
 *
 * Requests microphone access via getUserMedia, connects to an AnalyserNode,
 * and renders a real-time bar visualization of the input level.
 * Reports mic status and fires onAudioDetected when speech is picked up.
 */
export function AudioLevelMeter({
  onAudioDetected,
  bars = 12,
  threshold = 0.02,
}: AudioLevelMeterProps) {
  const [status, setStatus] = useState<MicStatus>('idle');
  const [levels, setLevels] = useState<number[]>(new Array(bars).fill(0));
  const [hasDetected, setHasDetected] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const onAudioDetectedRef = useRef(onAudioDetected);

  // Keep callback ref in sync
  useEffect(() => {
    onAudioDetectedRef.current = onAudioDetected;
  }, [onAudioDetected]);

  const startMic = useCallback(async () => {
    setStatus('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      analyserRef.current = analyser;

      setStatus('active');

      // Start animation loop
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const barCount = bars;

      const tick = () => {
        analyser.getByteFrequencyData(dataArray);

        // Compute RMS from frequency data
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = dataArray[i] / 255;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / dataArray.length);

        // Distribute into bars (lower frequencies on the left)
        const binSize = Math.floor(dataArray.length / barCount);
        const newLevels = new Array(barCount);
        for (let i = 0; i < barCount; i++) {
          let barSum = 0;
          for (let j = 0; j < binSize; j++) {
            barSum += dataArray[i * binSize + j] / 255;
          }
          newLevels[i] = barSum / binSize;
        }
        setLevels(newLevels);

        // Check threshold
        if (rms > threshold && !hasDetected) {
          setHasDetected(true);
          onAudioDetectedRef.current?.();
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      const error = err as DOMException;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setStatus('denied');
      } else {
        setStatus('error');
      }
    }
  }, [bars, threshold, hasDetected]);

  // Start on mount
  useEffect(() => {
    startMic();

    return () => {
      // Cleanup
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'denied') {
    return (
      <div className={styles.meterContainer} role="alert">
        <div className={styles.meterError}>
          <p className={styles.meterErrorTitle}>Microphone access denied</p>
          <p className={styles.meterErrorDesc}>
            Please allow microphone access in your browser settings and reload this page.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={styles.meterContainer} role="alert">
        <div className={styles.meterError}>
          <p className={styles.meterErrorTitle}>Could not access microphone</p>
          <p className={styles.meterErrorDesc}>
            Something went wrong. Check that a microphone is connected and try again.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'requesting' || status === 'idle') {
    return (
      <div className={styles.meterContainer} aria-label="Requesting microphone access">
        <div className={styles.meterBars} aria-hidden="true">
          {Array.from({ length: bars }).map((_, i) => (
            <div key={i} className={`${styles.meterBar} ${styles.meterBarIdle}`} />
          ))}
        </div>
        <p className={styles.meterLabel}>Requesting mic access...</p>
      </div>
    );
  }

  return (
    <div className={styles.meterContainer} aria-label="Audio level meter" role="meter" aria-valuemin={0} aria-valuemax={1}>
      <div className={styles.meterBars} aria-hidden="true">
        {levels.map((level, i) => (
          <div
            key={i}
            className={`${styles.meterBar} ${hasDetected ? styles.meterBarActive : ''}`}
            style={{ height: `${Math.max(4, level * 100)}%` }}
          />
        ))}
      </div>
      <p className={styles.meterLabel}>
        {hasDetected ? 'Audio detected — you\u2019re good to go!' : 'Speak to test your microphone...'}
      </p>
    </div>
  );
}
