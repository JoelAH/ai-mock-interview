'use client';

import { useCallback, useRef } from 'react';

/**
 * useTTS — client-side hook for text-to-speech playback.
 *
 * Calls POST /api/session/tts with the question text, receives a binary
 * audio stream, decodes it via Web Audio API, and plays it. Signals
 * completion via the onDone callback.
 *
 * Uses Web Audio API (decodeAudioData) instead of <audio> element
 * for more reliable streaming and completion detection.
 */

interface UseTTSOptions {
  /** Called when audio finishes playing */
  onDone?: () => void;
  /** Called if TTS fails (playback will be skipped) */
  onError?: (error: Error) => void;
}

export function useTTS({ onDone, onError }: UseTTSOptions = {}) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Keep callbacks fresh without re-creating speak()
  const onDoneRef = useRef(onDone);
  const onErrorRef = useRef(onError);
  onDoneRef.current = onDone;
  onErrorRef.current = onError;

  /**
   * Speak the given text. Fetches audio from the TTS API and plays it.
   * Returns a promise that resolves when playback completes.
   */
  const speak = useCallback(async (text: string) => {
    // Cancel any in-flight request or playback
    stop();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/session/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
      }

      // Read the full response as an ArrayBuffer for decoding
      const arrayBuffer = await response.arrayBuffer();

      if (controller.signal.aborted) return;

      // Create or resume AudioContext (browsers require user gesture)
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext();
      }
      const audioCtx = audioCtxRef.current;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      // Decode the audio data
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      if (controller.signal.aborted) return;

      // Add a tiny silence padding at the end to prevent the last frame
      // from being cut off by the decoder (common with streamed MP3/Opus).
      const paddedBuffer = audioCtx.createBuffer(
        audioBuffer.numberOfChannels,
        audioBuffer.length + audioCtx.sampleRate * 0.15, // 150ms padding
        audioBuffer.sampleRate,
      );
      for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
        paddedBuffer.getChannelData(ch).set(audioBuffer.getChannelData(ch));
      }

      // Play it
      const source = audioCtx.createBufferSource();
      source.buffer = paddedBuffer;
      source.connect(audioCtx.destination);
      sourceRef.current = source;

      source.onended = () => {
        sourceRef.current = null;
        onDoneRef.current?.();
      };

      source.start(0);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('[useTTS] Playback failed:', err);
      onErrorRef.current?.(err as Error);
      // If TTS fails, still signal done so the interview can continue
      onDoneRef.current?.();
    }
  }, []);

  /** Stop any in-progress fetch or playback */
  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {
        // Already stopped
      }
      sourceRef.current = null;
    }
  }, []);

  return { speak, stop };
}
