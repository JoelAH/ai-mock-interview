/**
 * ElevenLabs TTS adapter — premium voice for the top tier.
 *
 * Reserved for the Premium tier once validated. Not used in MVP
 * (tierConfigs.premium.ttsProvider is 'openai' at launch).
 *
 * Placeholder skeleton — full implementation wired in Task 17.
 */
import { requireEnv } from '@/lib/env';
import type { TtsAdapter, TtsOptions } from './types';

export const elevenlabsTtsAdapter: TtsAdapter = {
  provider: 'elevenlabs',

  async *streamTextToSpeech(
    _textStream: AsyncIterable<string>,
    _options?: TtsOptions,
  ): AsyncIterable<Uint8Array> {
    // Task 17: pipe text into ElevenLabs streaming TTS endpoint
    // (Flash model for low latency) and yield audio chunks.
    const _apiKey = requireEnv('ELEVENLABS_API_KEY');
    throw new Error(
      'Real ElevenLabs TTS not yet implemented. Set USE_MOCKS=true or implement Task 17.',
    );
  },
};
