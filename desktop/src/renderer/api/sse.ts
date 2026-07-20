/**
 * SSE (Server-Sent Events) stream parser.
 *
 * Consumes a ReadableStream<Uint8Array> from a fetch response and yields
 * parsed JSON objects from each `data: {...}\n\n` frame.
 */

/**
 * Parses an SSE stream and yields typed chunks.
 * Handles multi-byte characters and partial line buffering.
 */
export async function* parseSSEStream<T>(
  response: Response
): AsyncGenerator<T, void, undefined> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Process any remaining buffer content
        if (buffer.trim()) {
          const parsed = parseDataLine<T>(buffer.trim());
          if (parsed !== null) yield parsed;
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Split on double newline (SSE frame delimiter)
      const frames = buffer.split('\n\n');

      // Last element is either empty (complete frame) or a partial frame
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        const parsed = parseFrame<T>(frame);
        if (parsed !== null) yield parsed;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Parses a single SSE frame which may contain multiple fields.
 * We only care about `data:` lines.
 */
function parseFrame<T>(frame: string): T | null {
  const lines = frame.split('\n');

  for (const line of lines) {
    const parsed = parseDataLine<T>(line);
    if (parsed !== null) return parsed;
  }

  return null;
}

/**
 * Extracts and parses a JSON object from a `data: ...` line.
 */
function parseDataLine<T>(line: string): T | null {
  if (!line.startsWith('data:')) return null;

  const jsonStr = line.slice(5).trim();
  if (!jsonStr || jsonStr === '[DONE]') return null;

  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    console.warn('[SSE] Failed to parse data line:', jsonStr);
    return null;
  }
}
