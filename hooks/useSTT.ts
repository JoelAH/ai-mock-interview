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

  /** Clean up all resources. Defined before start() so start can reuse it. */
  const cleanup = useCallback(() => {
    // Disconnect audio nodes
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
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

    // Close WebSocket with an explicit normal-closure code. Calling close()
    // with no code produces a 1005 ("no status") close event, which is
    // indistinguishable from an abnormal server drop.
    if (wsRef.current) {
      const sock = wsRef.current;
      wsRef.current = null;
      if (sock.readyState === WebSocket.OPEN) {
        try { sock.send(new Uint8Array(0)); } catch {}
      }
      if (sock.readyState === WebSocket.OPEN || sock.readyState === WebSocket.CONNECTING) {
        try { sock.close(1000, 'client cleanup'); } catch {}
      }
    }
  }, []);

  /** Start listening — request mic, connect to Deepgram */
  const start = useCallback(async () => {
    // Tear down any prior session first so sockets/streams never overlap.
    cleanup();

    // Reset transcript state
    finalsRef.current = [];
    interimRef.current = '';

    try {
      // 1. Get mic audio FIRST. Doing this before opening the socket means
      //    audio starts flowing right on open — Deepgram closes idle
      //    connections (~10-12s with no audio), which surfaces as a 1005 close.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: TARGET_SAMPLE_RATE,
        },
      });
      streamRef.current = stream;

      // 2. Get scoped token from our server
      const tokenRes = await fetch('/api/deepgram/token', { method: 'POST' });
      if (!tokenRes.ok) {
        const errBody = await tokenRes.json().catch(() => ({}));
        throw new Error(
          errBody.detail || errBody.error || `Token API error: ${tokenRes.status}`,
        );
      }
      const { token, url } = await tokenRes.json();

      // 3. Open WebSocket to Deepgram.
      // The token from /v1/auth/grant is a temporary JWT, which Deepgram
      // authenticates over the browser WebSocket via the 'bearer' subprotocol.
      // (The 'token' subprotocol is only for raw API keys; query-param auth is
      // rejected. Verified against the live API.)
      const ws = new WebSocket(url, ['bearer', token]);
      wsRef.current = ws;
      let didOpen = false;

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

      ws.onclose = () => {
        // Normal lifecycle — no action needed.
      };

      // 4. Wait for the socket to open (or fail) before wiring up audio.
      //    Named handlers are removed on settle so a later close doesn't
      //    trigger a misleading "closed before opening" rejection.
      await new Promise<void>((resolve, reject) => {
        const settle = () => {
          clearTimeout(timeout);
          ws.removeEventListener('open', onOpen);
          ws.removeEventListener('close', onClose);
          ws.removeEventListener('error', onError);
        };
        const onOpen = () => { didOpen = true; settle(); resolve(); };
        const onClose = (event: CloseEvent) => { settle(); reject(new Error(`WebSocket closed before connecting (code ${event.code})`)); };
        const onError = () => { settle(); reject(new Error('WebSocket failed to connect')); };
        const timeout = setTimeout(() => { settle(); reject(new Error('WebSocket open timeout')); }, 10000);
        ws.addEventListener('open', onOpen);
        ws.addEventListener('close', onClose);
        ws.addEventListener('error', onError);
      });

      // 5. Set up audio processing pipeline
      const audioCtx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
      audioCtxRef.current = audioCtx;
      // Chrome creates AudioContexts in a "suspended" state; without resuming,
      // onaudioprocess never fires, no audio is sent, and Deepgram drops the
      // idle socket (1005). Resume explicitly.
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume().catch(() => {});
      }

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Use ScriptProcessorNode to capture raw PCM
      // (AudioWorklet would be ideal but requires a separate file and more setup)
      const processor = audioCtx.createScriptProcessor(BUFFER_SIZE, 1, 1);
      processorRef.current = processor;

      let sentChunks = 0;
      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBuffer = downsampleToInt16(inputData, audioCtx.sampleRate);
        ws.send(pcmBuffer);
        sentChunks++;
      };

      source.connect(processor);
      processor.connect(audioCtx.destination); // Required for onaudioprocess to fire
    } catch (err) {
      console.error('[useSTT] Start failed:', err);
      onErrorRef.current?.(err as Error);
      cleanup();
    }
  }, [downsampleToInt16, emitTranscript, cleanup]);

  /** Stop listening and close all resources */
  const stop = useCallback(() => {
    cleanup();
    // Emit a final transcript in case there's a trailing interim
    if (interimRef.current) {
      finalsRef.current.push(interimRef.current);
      interimRef.current = '';
    }
    emitTranscript(true);
  }, [emitTranscript, cleanup]);

  /** Get the current accumulated transcript */
  const getTranscript = useCallback((): string => {
    const parts = [...finalsRef.current];
    if (interimRef.current) {
      parts.push(interimRef.current);
    }
    return parts.join(' ').trim();
  }, []);

  return { start, stop, getTranscript };
}
