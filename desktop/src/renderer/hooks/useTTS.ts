import { useRef, useState, useCallback } from 'react';
import { api } from '../api/client';

/**
 * Text-to-speech playback via Web Audio API.
 *
 * Fetches audio from /api/session/tts and plays it immediately.
 * Supports stopping mid-playback.
 */

interface UseTTSReturn {
  isPlaying: boolean;
  play: (text: string) => Promise<void>;
  stop: () => void;
}

export function useTTS(): UseTTSReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const play = useCallback(async (text: string) => {
    // Stop any current playback
    stopPlayback();

    setIsPlaying(true);

    try {
      // Fetch audio bytes from the TTS endpoint
      const audioBuffer = await api.sessionTts({ text });

      // Create or reuse AudioContext
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;

      // Resume if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Decode the audio data
      const decoded = await ctx.decodeAudioData(audioBuffer);

      // Play through a buffer source
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      sourceNodeRef.current = source;

      source.onended = () => {
        setIsPlaying(false);
        sourceNodeRef.current = null;
      };

      source.start(0);
    } catch (err) {
      console.error('[TTS] Playback error:', err);
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    stopPlayback();
    setIsPlaying(false);
  }, []);

  function stopPlayback() {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {
        // Already stopped
      }
      sourceNodeRef.current = null;
    }
  }

  return { isPlaying, play, stop };
}
