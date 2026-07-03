/**
 * ElevenLabs integration — text-to-speech streaming.
 *
 * Framework-agnostic: no HTTP or Next.js imports.
 * In mock mode, yields silence bytes to simulate the streaming audio flow
 * without hitting ElevenLabs' API.
 */
import { isMockMode, requireEnv } from '@/lib/env';

/**
 * Streams text into speech audio chunks.
 * Input: an async iterable of text fragments (streamed from the LLM).
 * Output: an async iterable of audio bytes (Uint8Array) for playback.
 *
 * In mock mode, yields small silent audio buffers to simulate latency.
 */
export async function* streamTextToSpeech(
  textStream: AsyncIterable<string>,
): AsyncIterable<Uint8Array> {
  if (isMockMode()) {
    // Consume the text stream (to mimic backpressure behavior) and yield silence.
    for await (const _chunk of textStream) {
      // 1KB of silence per text chunk — enough to test the pipeline.
      yield new Uint8Array(1024);
    }
    return;
  }

  // Real implementation (Task 17):
  // Pipe text into ElevenLabs streaming TTS endpoint and yield audio chunks.
  const _apiKey = requireEnv('ELEVENLABS_API_KEY');
  throw new Error(
    'Real ElevenLabs TTS not yet implemented. Set USE_MOCKS=true or implement Task 17.',
  );
}
