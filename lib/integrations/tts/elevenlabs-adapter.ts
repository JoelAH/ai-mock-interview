/**
 * ElevenLabs TTS adapter — premium voice for the top tier.
 *
 * Uses the ElevenLabs streaming REST endpoint to produce low-latency audio.
 * The adapter buffers incoming text fragments and calls the streaming endpoint
 * which returns audio bytes via chunked transfer encoding.
 *
 * Reserved for the Premium tier once validated. Not used in MVP
 * (tierConfigs.premium.ttsProvider is 'openai' at launch; flip to 'elevenlabs'
 * when ready — no other code changes needed).
 *
 * No framework imports — usable from any server context.
 */
import { requireEnv } from '@/lib/env';
import type { TtsAdapter, TtsOptions } from './types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Default ElevenLabs voice ID — Rachel (clear, professional female voice). */
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

/** Model — eleven_flash_v2_5 for lowest latency streaming. */
const MODEL_ID = 'eleven_flash_v2_5';

/** ElevenLabs API base URL. */
const API_BASE = 'https://api.elevenlabs.io';

/** Output format — mp3 at 44.1kHz for broad compatibility. */
const DEFAULT_OUTPUT_FORMAT = 'mp3_44100_128';

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const elevenlabsTtsAdapter: TtsAdapter = {
  provider: 'elevenlabs',

  async *streamTextToSpeech(
    textStream: AsyncIterable<string>,
    options?: TtsOptions,
  ): AsyncIterable<Uint8Array> {
    // 1. Buffer the text stream into a single string.
    //    Interviewer questions are short so buffering is fine.
    let fullText = '';
    for await (const fragment of textStream) {
      fullText += fragment;
    }

    if (!fullText.trim()) {
      return; // Nothing to synthesize
    }

    // 2. Call ElevenLabs streaming TTS endpoint.
    const apiKey = requireEnv('ELEVENLABS_API_KEY');
    const voiceId = options?.voice ?? DEFAULT_VOICE_ID;
    const outputFormat = options?.format ?? DEFAULT_OUTPUT_FORMAT;

    const url = `${API_BASE}/v1/text-to-speech/${voiceId}/stream?output_format=${outputFormat}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: fullText,
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `ElevenLabs TTS failed (${response.status}): ${errorBody}`,
      );
    }

    // 3. Stream audio bytes from the response body (chunked transfer).
    const body = response.body;
    if (!body) {
      throw new Error('ElevenLabs TTS returned no response body.');
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
