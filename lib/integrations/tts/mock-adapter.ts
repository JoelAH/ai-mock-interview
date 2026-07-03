/**
 * Mock TTS adapter — yields silent audio buffers without any network call.
 * Used when USE_MOCKS=true (dev/test). Consumes the text stream to mimic
 * real backpressure behavior in the pipeline.
 */
import type { TtsAdapter, TtsOptions } from './types';

export const mockTtsAdapter: TtsAdapter = {
  provider: 'mock',

  async *streamTextToSpeech(
    textStream: AsyncIterable<string>,
    _options?: TtsOptions,
  ): AsyncIterable<Uint8Array> {
    for await (const _chunk of textStream) {
      // 1KB of silence per text fragment — enough to exercise the pipeline.
      yield new Uint8Array(1024);
    }
  },
};
