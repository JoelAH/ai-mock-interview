'use client';

import { useCallback, useRef } from 'react';

/**
 * useSTT — client-side hook for real-time speech-to-text via Deepgram.
 *
 * Flow:
 * 1. Fetches a scoped token from POST /api/deepgram/token
 * 2. Opens a WebSocket to Deepgram's live transcription endpoint
 * 3. Captures mic audio via getUserMedia
 * 4. Converts audio to linear16 @ 16kHz and streams to the WebSocket
 * 5. Calls onTranscript with interim/final text as it arrives
 *
 * The hook exposes start() and stop() — the consuming component
 * controls when listening begins and ends.
 */

interface UseSTTOptions {
  /** Called with the accumulated transcript text (interim updates included) */
  onTranscript?: (text: string, isFinal: boolean) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
}

/** Target sample rate expected by Deepgram (configured server-side) */
const TARGET_SAMPLE_RATE = 16000;

/** Buffer size for the ScriptProcessorNode */
const BUFFER_SIZE = 4096;

export function useSTT({ onTranscript, onError }: UseSTTOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Track transcript segments: finals are committed, interim is the current partial
  const finalsRef = useRef<string[]>([]);
  const interimRef = useRef<string>('');

  // Keep callbacks fresh
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  onTranscriptRef.current = onTranscript;
  onErrorRef.current = onError;

  /** Emit the current full transcript (all finals + current interim) */
  const emitTranscript = useCallback((isFinal: boolean) => {
    const parts = [...finalsRef.current];
    if (interimRef.current) {
      parts.push(interimRef.current);
    }
    const fullText = parts.join(' ').trim();
    onTranscriptRef.current?.(fullText, isFinal);
  }, []);

  /**
   * Downsample a Float32Array from the source sample rate to 16kHz
   * and convert to Int16 (linear16).
   */
  const downsampleToInt16 = useCallback((buffer: Float32Array, inputSampleRate: number): ArrayBuffer => {
    const ratio = inputSampleRate / TARGET_SAMPLE_RATE;
    const outputLength = Math.floor(buffer.length / ratio);
    const output = new Int16Array(outputLength);

    for (let i = 0; i < outputLength; i++) {
      const srcIndex = Math.floor(i * ratio);
      // Clamp to [-1, 1] and convert to Int16 range
      const sample = Math.max(-1, Math.min(1, buffer[srcIndex]));
      output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    return output.buffer;
  }, []);

  /** Start listening — request mic, connect to Deepgram */
  const start = useCallback(async () => {
    // Reset transcript state
    finalsRef.current = [];
    interimRef.current = '';

    try {
      // 1. Get scoped token from our server
      const tokenRes = await fetch('/api/deepgram/token', { method: 'POST' });
      if (!tokenRes.ok) {
        throw new Error(`Token API error: ${tokenRes.status}`);
      }
      const { token, url } = await tokenRes.json();

      // 2. Open WebSocket to Deepgram
      const ws = new WebSocket(url, ['token', token]);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          // Deepgram sends different message types
          if (msg.type === 'Results' && msg.channel?.alternatives?.[0]) {
            const alt = msg.channel.alternatives[0];
            const text = alt.transcript || '';

            if (msg.is_final) {
              // Commit this segment
              if (text) {
                finalsRef.current.push(text);
              }
              interimRef.current = '';
              emitTranscript(true);
            } else {
              // Interim result — replace previous interim
              interimRef.current = text;
              emitTranscript(false);
            }
          }
        } catch {
          // Skip malformed messages
        }
      };

      ws.onerror = () => {
        onErrorRef.current?.(new Error('Deepgram WebSocket error'));
      };

      ws.onclose = () => {
        // Normal close — no action needed
      };

      // 3. Wait for WebSocket to open before starting audio
      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        // If it fails to open, the onerror above will fire
        const timeout = setTimeout(() => reject(new Error('WebSocket open timeout')), 5000);
        const origOnOpen = ws.onopen;
        ws.onopen = (e) => {
          clearTimeout(timeout);
          (origOnOpen as (ev: Event) => void)?.(e);
        };
      });

      // 4. Get mic audio
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: TARGET_SAMPLE_RATE,
        },
      });
      streamRef.current = stream;

      // 5. Set up audio processing pipeline
      const audioCtx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Use ScriptProcessorNode to capture raw PCM
      // (AudioWorklet would be ideal but requires a separate file and more setup)
      const processor = audioCtx.createScriptProcessor(BUFFER_SIZE, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBuffer = downsampleToInt16(inputData, audioCtx.sampleRate);
        ws.send(pcmBuffer);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination); // Required for onaudioprocess to fire

    } catch (err) {
      console.error('[useSTT] Start failed:', err);
      onErrorRef.current?.(err as Error);
      cleanup();
    }
  }, [downsampleToInt16, emitTranscript]);

  /** Stop listening and close all resources */
  const stop = useCallback(() => {
    cleanup();
    // Emit a final transcript in case there's a trailing interim
    if (interimRef.current) {
      finalsRef.current.push(interimRef.current);
      interimRef.current = '';
    }
    emitTranscript(true);
  }, [emitTranscript]);

  /** Get the current accumulated transcript */
  const getTranscript = useCallback((): string => {
    const parts = [...finalsRef.current];
    if (interimRef.current) {
      parts.push(interimRef.current);
    }
    return parts.join(' ').trim();
  }, []);

  /** Clean up all resources */
  const cleanup = useCallback(() => {
    // Disconnect audio nodes
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // Close audio context
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    // Stop mic stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Close WebSocket (send close signal to Deepgram first)
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        // Send empty buffer to signal end of audio
        wsRef.current.send(new Uint8Array(0));
        wsRef.current.close();
      }
      wsRef.current = null;
    }
  }, []);

  return { start, stop, getTranscript };
}
