import { useRef, useState, useCallback } from 'react';
import { api } from '../api/client';

/**
 * Real-time speech-to-text via Deepgram WebSocket.
 *
 * Flow:
 * 1. Get scoped token from backend (/api/deepgram/token)
 * 2. Open WebSocket to Deepgram with token in subprotocol
 * 3. Stream mic audio (16kHz linear16) to WebSocket
 * 4. Receive interim + final transcripts
 * 5. Call onFinalTranscript when user stops speaking (utterance end)
 */

interface UseSTTOptions {
  onInterimTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
  onUtteranceEnd?: () => void;
}

interface UseSTTReturn {
  isListening: boolean;
  transcript: string;
  interimText: string;
  /** Returns the current full transcript directly from the ref (not stale state). */
  getTranscript: () => string;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export function useSTT(options: UseSTTOptions = {}): UseSTTReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Track finals as an array of segments — avoids duplication from overlapping results
  const finalsRef = useRef<string[]>([]);
  const interimRef = useRef<string>('');

  const start = useCallback(async () => {
    // Get scoped token from backend
    const { token, url } = await api.deepgramToken();

    // Open WebSocket with scoped JWT via bearer subprotocol
    const ws = new WebSocket(url, ['bearer', token]);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = async () => {
      // Start mic capture
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);

      // Use ScriptProcessorNode to get raw PCM data
      // (AudioWorklet would be cleaner but requires more setup)
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Convert float32 to int16
        const int16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        ws.send(int16.buffer);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
      setIsListening(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as {
          type?: string;
          is_final?: boolean;
          speech_final?: boolean;
          channel?: {
            alternatives?: Array<{ transcript?: string }>;
          };
        };

        if (data.type === 'UtteranceEnd') {
          if (finalsRef.current.length > 0) {
            options.onUtteranceEnd?.();
          }
          return;
        }

        const text = data.channel?.alternatives?.[0]?.transcript ?? '';
        if (!text) return;

        if (data.is_final) {
          // Commit this segment to the finals array
          finalsRef.current.push(text);
          interimRef.current = '';

          const fullText = finalsRef.current.join(' ');
          setTranscript(fullText);
          setInterimText('');
          options.onFinalTranscript?.(fullText);
        } else {
          // Interim — just replace the current partial
          interimRef.current = text;
          setInterimText(text);
          options.onInterimTranscript?.(text);
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    ws.onerror = () => {
      cleanup();
    };

    ws.onclose = () => {
      setIsListening(false);
    };
  }, [options]);

  const stop = useCallback(() => {
    // Send close signal to Deepgram
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'CloseStream' }));
      wsRef.current.close();
    }
    cleanup();
  }, []);

  const reset = useCallback(() => {
    finalsRef.current = [];
    interimRef.current = '';
    setTranscript('');
    setInterimText('');
  }, []);

  function cleanup() {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    wsRef.current = null;
    setIsListening(false);
  }

  /** Get the current transcript directly from the ref — always fresh, no stale closure issues. */
  const getTranscript = useCallback(() => {
    const parts = [...finalsRef.current];
    if (interimRef.current) {
      parts.push(interimRef.current);
    }
    return parts.join(' ').trim();
  }, []);

  return {
    isListening,
    transcript,
    interimText,
    getTranscript,
    start,
    stop,
    reset,
  };
}
