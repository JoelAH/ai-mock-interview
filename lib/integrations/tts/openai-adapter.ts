/**
 * OpenAI TTS adapter — uses OpenAI's gpt-4o-mini-tts for speech synthesis.
 *
 * This is the MVP default for ALL tiers (cheapest high-quality option,
 * ~$0.15/session, and reuses the OpenAI account already used for the LLM).
 *
 * Placeholder skeleton — full implementation wired in Task 17.
 */
import { requireEnv } from '@/lib/env';
import type { TtsAdapter, TtsOptions } from './types';

/** Default OpenAI voice; override via TtsOptions.voice */
const DEFAULT_VOICE = 'alloy';

export const openaiTtsAdapter: TtsAdapter = {
  provider: 'openai',

  async *streamTextToSpeech(
    _textStream: AsyncIterable<string>,
    _options?: TtsOptions,
  ): AsyncIterable<Uint8Array> {
    // Task 17: buffer/stream text into OpenAI audio.speech.create()
    // with model 'gpt-4o-mini-tts', stream: true, and yield audio chunks.
    const _apiKey = requireEnv('OPENAI_API_KEY');
    void DEFAULT_VOICE;
    throw new Error(
      'Real OpenAI TTS not yet implemented. Set USE_MOCKS=true or implement Task 17.',
    );
  },
};
