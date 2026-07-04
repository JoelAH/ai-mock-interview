/**
 * Lemon Squeezy integration — webhook signature verification + event parsing.
 *
 * Framework-agnostic: no HTTP or Next.js imports.
 * In mock mode, skips signature verification and returns parsed event directly.
 *
 * Lemon Squeezy signs webhook payloads using HMAC-SHA256 with the webhook secret.
 * The signature is sent in the `X-Signature` header as a hex string.
 */
import { createHmac, timingSafeEqual } from 'crypto';
import { isMockMode, requireEnv } from '@/lib/env';

export interface LemonSqueezyEvent {
  eventName: string;
  data: {
    id: string;
    attributes: {
      customer_id: number;
      variant_id: number;
      status: string;
      user_email: string;
      custom_data?: { clerk_user_id?: string } | null;
      [key: string]: unknown;
    };
  };
}

/**
 * Verifies the HMAC-SHA256 signature of a Lemon Squeezy webhook payload.
 * Uses timing-safe comparison to prevent timing attacks.
 */
function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const hmac = createHmac('sha256', secret);
  const digest = hmac.update(rawBody).digest('hex');

  // Timing-safe comparison
  const sigBuffer = Buffer.from(signature, 'hex');
  const digestBuffer = Buffer.from(digest, 'hex');

  if (sigBuffer.length !== digestBuffer.length) {
    return false;
  }

  return timingSafeEqual(sigBuffer, digestBuffer);
}

/**
 * Verifies the webhook signature and parses the event payload.
 * In mock mode, skips verification and returns the parsed JSON directly.
 *
 * @param rawBody - The raw request body as a string
 * @param signature - The X-Signature header value (hex-encoded HMAC-SHA256)
 * @throws Error if the signature is missing or invalid
 */
export async function verifyAndParseWebhook(
  rawBody: string,
  signature: string | null,
): Promise<LemonSqueezyEvent> {
  if (isMockMode()) {
    // Skip signature verification in mock mode — just parse the JSON.
    return JSON.parse(rawBody) as LemonSqueezyEvent;
  }

  const secret = requireEnv('LEMONSQUEEZY_WEBHOOK_SECRET');

  if (!signature) {
    throw new Error('Missing X-Signature header on Lemon Squeezy webhook.');
  }

  const isValid = verifySignature(rawBody, signature, secret);
  if (!isValid) {
    throw new Error('Invalid webhook signature — payload may have been tampered with.');
  }

  return JSON.parse(rawBody) as LemonSqueezyEvent;
}
