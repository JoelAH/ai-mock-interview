/**
 * Storage integration — S3 audio upload/retrieval.
 *
 * Framework-agnostic: no HTTP or Next.js imports.
 * In mock mode, stores audio in-memory (dev only, cleared on restart).
 * In production, uses the S3 bucket provisioned by CDK.
 */
import { isMockMode, requireEnv } from '@/lib/env';

// In-memory store for mock mode (simulates S3 without network).
const mockStore = new Map<string, Buffer>();

export interface StorageResult {
  /** The key/path in the bucket */
  key: string;
  /** Full URL or mock placeholder */
  url: string;
}

/**
 * Uploads an audio buffer to storage.
 * Returns the storage key and a URL for retrieval.
 */
export async function uploadAudio(
  sessionId: string,
  questionOrder: number,
  audio: Buffer,
): Promise<StorageResult> {
  const key = `sessions/${sessionId}/q${questionOrder}.webm`;

  if (isMockMode()) {
    mockStore.set(key, audio);
    return {
      key,
      url: `mock://audio-bucket/${key}`,
    };
  }

  // Real implementation (Task 17):
  // Use AWS SDK v3 S3Client to PutObject into the CDK-provisioned bucket.
  const _bucket = requireEnv('S3_AUDIO_BUCKET');
  throw new Error(
    'Real S3 upload not yet implemented. Set USE_MOCKS=true or implement Task 17.',
  );
}

/**
 * Retrieves a signed URL for an audio file.
 */
export async function getAudioUrl(key: string): Promise<string> {
  if (isMockMode()) {
    return `mock://audio-bucket/${key}`;
  }

  const _bucket = requireEnv('S3_AUDIO_BUCKET');
  throw new Error(
    'Real S3 signed URL not yet implemented. Set USE_MOCKS=true or implement Task 17.',
  );
}

/**
 * Clears the in-memory mock store (useful in tests).
 */
export function clearMockStorage(): void {
  mockStore.clear();
}
