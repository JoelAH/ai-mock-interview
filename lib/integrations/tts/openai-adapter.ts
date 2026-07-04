/**
 * OpenAI TTS adapter — uses OpenAI's gpt-4o-mini-tts for speech synthesis.
 *
 * This is the MVP default for ALL tiers (cheapest high-quality option,
 * ~$0.15/session, and reuses the OpenAI account already used for the LLM).
 *
 * The adapter buffers incoming text fragments, then calls OpenAI's audio.speech
 * endpoint with the full text and streams the audio response back as chunks.
 * For short interviewer questions (1-3 sentences) the buffering overhead is
 * negligible — audio starts flowing within ~200ms of the text being complete.
 *
 * No framework imports — usable from any server context.
 */
import OpenAI from 'openai';
import { requireEnv } from '@/lib/env';
import type { TtsAdapter, TtsOptions } from './types';

// ---------------------------------------------------------------------------
// Client singleton (lazy init)
// ---------------------------------------------------------------------------
let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: requireEnv('OPENAI_API_KEY') });
  }
  return _client;
}

/** Exported for testing — allows injecting a mock OpenAI client. */
export function _setTtsClientForTesting(client: OpenAI | null): void {
  _client = client;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Default voice — natural, neutral tone good for an interviewer. */
const DEFAULT_VOICE = 'alloy';

/** Model — gpt-4o-mini-tts is cheapest with good quality + streaming support. */
const MODEL = 'gpt-4o-mini-tts';

/** Output format — opus is compact and widely supported for web playback. */
const DEFAULT_FORMAT: 'opus' | 'mp3' | 'pcm' = 'opus';

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const openaiTtsAdapter: TtsAdapter = {
  provider: 'openai',

  async *streamTextToSpeech(
    textStream: AsyncIterable<string>,
    options?: TtsOptions,
  ): AsyncIterable<Uint8Array> {
    // 1. Buffer the text stream into a single string.
    //    Interviewer questions are short (1-3 sentences), so buffering is fine.
    //    For longer text, a chunked approach would be needed.
    let fullText = '';
    for await (const fragment of textStream) {
      fullText += fragment;
    }

    if (!fullText.trim()) {
      return; // Nothing to synthesize
    }

    // 2. Call OpenAI TTS — returns a Response with a streaming body.
    const client = getClient();
    const voice = options?.voice ?? DEFAULT_VOICE;
    const format = (options?.format as 'opus' | 'mp3' | 'pcm') ?? DEFAULT_FORMAT;

    const response = await client.audio.speech.create({
      model: MODEL,
      voice,
      input: fullText,
      response_format: format,
    });

    // 3. Stream audio bytes from the response body.
    const body = response.body;
    if (!body) {
      throw new Error('OpenAI TTS returned no response body.');
    }

    // The response is a web Response — body is a ReadableStream<Uint8Array>
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
