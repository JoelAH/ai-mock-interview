/**
 * Lemon Squeezy integration — webhook signature verification + event parsing.
 *
 * Framework-agnostic: no HTTP or Next.js imports.
 * In mock mode, skips signature verification and returns parsed event directly.
 */
import { isMockMode, requireEnv } from '@/lib/env';

export interface LemonSqueezyEvent {
  eventName: string;
  data: {
    id: string;
    attributes: {
      customer_id: number;
      status: string;
      user_email: string;
      [key: string]: unknown;
    };
  };
}

/**
 * Verifies the webhook signature and parses the event payload.
 * In mock mode, skips verification and returns the parsed JSON directly.
 */
export async function verifyAndParseWebhook(
  rawBody: string,
  signature: string | null,
): Promise<LemonSqueezyEvent> {
  if (isMockMode()) {
    // Skip signature verification in mock mode — just parse the JSON.
    return JSON.parse(rawBody) as LemonSqueezyEvent;
  }

  // Real implementation (Task 19):
  // Verify HMAC signature using LEMONSQUEEZY_WEBHOOK_SECRET, then parse.
  const _secret = requireEnv('LEMONSQUEEZY_WEBHOOK_SECRET');
  throw new Error(
    'Real Lemon Squeezy webhook verification not yet implemented. Set USE_MOCKS=true or implement Task 19.',
  );
}
