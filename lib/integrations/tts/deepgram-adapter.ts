/**
 * Deepgram TTS adapter — uses Deepgram Aura-2 for speech synthesis.
 *
 * Default provider for all tiers at launch (leverages $200 free credit
 * covering both STT and TTS under one key). Low latency, good quality,
 * simpler billing (single provider for voice).
 *
 * Falls back gracefully — if voice quality feedback from users suggests
 * switching, flip to 'openai' in lib/config/tiers.ts (one line).
 *
 * API: POST https://api.deepgram.com/v1/speak?model={model}
 * Auth: Token header (same key as STT)
 * Response: chunked audio/mpeg stream
 *
 * No framework imports — usable from any server context.
 */
import { requireEnv } from '@/lib/env';
import type { TtsAdapter, TtsOptions } from './types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Default Deepgram Aura-2 voice — Pluto (clear, professional male). */
const DEFAULT_MODEL = 'aura-2-pluto-en';

/** Deepgram TTS endpoint. */
const API_URL = 'https://api.deepgram.com/v1/speak';

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const deepgramTtsAdapter: TtsAdapter = {
  provider: 'deepgram',

  async *streamTextToSpeech(
    textStream: AsyncIterable<string>,
    options?: TtsOptions,
  ): AsyncIterable<Uint8Array> {
    // 1. Buffer the text stream into a single string.
    //    Interviewer questions are short (1-3 sentences, well under the 2000 char limit).
    let fullText = '';
    for await (const fragment of textStream) {
      fullText += fragment;
    }

    if (!fullText.trim()) {
      return; // Nothing to synthesize
    }

    // 2. Call Deepgram TTS endpoint — streams audio back via chunked transfer.
    const apiKey = requireEnv('DEEPGRAM_API_KEY');
    const model = options?.voice ?? DEFAULT_MODEL;

    const url = `${API_URL}?model=${encodeURIComponent(model)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: fullText }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Deepgram TTS failed (${response.status}): ${errorBody}`,
      );
    }

    // 3. Stream audio bytes from the chunked response body.
    const body = response.body;
    if (!body) {
      throw new Error('Deepgram TTS returned no response body.');
    }

    const reader = (body as ReadableStream<Uint8Array>).getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          yield value;
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};
