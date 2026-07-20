import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import './MicCheck.css';

type MicState = 'idle' | 'requesting' | 'active' | 'denied' | 'error';

export default function MicCheck() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId') ?? '';

  const [micState, setMicState] = useState<MicState>('idle');
  const [level, setLevel] = useState(0);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [peakDetected, setPeakDetected] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const startMic = useCallback(async () => {
    setMicState('requesting');
    setErrorMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Get device name
      const audioTrack = stream.getAudioTracks()[0];
      setDeviceName(audioTrack?.label || 'Unknown microphone');

      // Set up audio analysis for level meter
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      setMicState('active');

      // Start level monitoring
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const monitor = () => {
        analyser.getByteFrequencyData(dataArray);
        // Calculate RMS-like level from frequency data
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(avg / 128, 1); // 0-1 range
        setLevel(normalized);

        if (normalized > 0.15 && !peakDetected) {
          setPeakDetected(true);
        }

        animFrameRef.current = requestAnimationFrame(monitor);
      };
      monitor();
    } catch (err) {
      const error = err as Error;
      if (
        error.name === 'NotAllowedError' ||
        error.name === 'PermissionDeniedError'
      ) {
        setMicState('denied');
      } else {
        setMicState('error');
        setErrorMessage(error.message || 'Failed to access microphone');
      }
    }
  }, [peakDetected]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Auto-start mic request on mount
  useEffect(() => {
    startMic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStartInterview() {
    // Clean up mic stream — interview session will request its own
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    window.location.hash = `#/interview/session?sessionId=${sessionId}`;
  }

  // --- Permission Denied ---
  if (micState === 'denied') {
    return (
      <div className="mic-check">
        <div className="mic-check-content">
          <div className="mic-check-icon mic-check-icon--error">✕</div>
          <h1 className="mic-check-title">Microphone Access Denied</h1>
          <p className="mic-check-desc">
            DevMockView needs microphone access for the interview.
          </p>
          <div className="mic-check-instructions">
            <p>To fix this:</p>
            <ol>
              <li>Open <strong>System Settings</strong> → <strong>Privacy & Security</strong> → <strong>Microphone</strong></li>
              <li>Enable the toggle for <strong>DevMockView</strong></li>
              <li>Come back and try again</li>
            </ol>
          </div>
          <button className="mic-check-btn mic-check-btn--retry" onClick={startMic}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // --- Error ---
  if (micState === 'error') {
    return (
      <div className="mic-check">
        <div className="mic-check-content">
          <div className="mic-check-icon mic-check-icon--error">!</div>
          <h1 className="mic-check-title">Microphone Error</h1>
          <p className="mic-check-desc">
            {errorMessage || 'Could not access your microphone.'}
          </p>
          <button className="mic-check-btn mic-check-btn--retry" onClick={startMic}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // --- Requesting / Active ---
  return (
    <div className="mic-check">
      <div className="mic-check-content">
        <div className="mic-check-icon">🎙</div>
        <h1 className="mic-check-title">Mic Check</h1>
        <p className="mic-check-desc">
          {micState === 'requesting'
            ? 'Requesting microphone access…'
            : 'Speak a test phrase to verify your mic is working'}
        </p>

        {/* Audio level meter */}
        <div className="mic-level-container">
          <div className="mic-level-track">
            <div
              className="mic-level-bar"
              style={{ width: `${Math.max(level * 100, 2)}%` }}
            />
          </div>
          <div className="mic-level-dots">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className={`mic-level-dot ${level > i / 20 ? 'mic-level-dot--active' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Device info */}
        {deviceName && (
          <p className="mic-device-name">
            Using: {deviceName}
          </p>
        )}

        {/* Status indicator */}
        {micState === 'active' && (
          <div className="mic-status">
            {peakDetected ? (
              <span className="mic-status-ok">✓ Microphone is working</span>
            ) : (
              <span className="mic-status-waiting">Waiting for audio…</span>
            )}
          </div>
        )}

        {/* Start Interview button */}
        <button
          className="mic-check-btn mic-check-btn--primary"
          disabled={!peakDetected}
          onClick={handleStartInterview}
        >
          Start Interview
        </button>
      </div>
    </div>
  );
}
