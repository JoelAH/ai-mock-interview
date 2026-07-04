import { verifyAndParseWebhook } from '@/lib/integrations';
import { billingService } from '@/lib/services';

/**
 * POST /api/webhooks/lemonsqueezy
 *
 * Handles Lemon Squeezy subscription lifecycle webhooks.
 * This route is public (matched by the webhooks exclusion in middleware).
 *
 * Flow:
 * 1. Read raw body + X-Signature header
 * 2. Verify HMAC-SHA256 signature via the integration layer
 * 3. Delegate to billingService.handleWebhookEvent() for state sync
 *
 * Returns 200 on success (even if the event is a no-op, e.g. missing clerk_user_id)
 * to prevent Lemon Squeezy from retrying indefinitely.
 */
export async function POST(request: Request) {
  // 1. Read raw body for signature verification (must not be parsed first)
  const rawBody = await request.text();
  const signature = request.headers.get('x-signature');

  // 2. Verify signature and parse
  let event;
  try {
    event = await verifyAndParseWebhook(rawBody, signature);
  } catch (err) {
    console.error('[POST /api/webhooks/lemonsqueezy] Verification failed:', err);
    return new Response('Invalid signature', { status: 401 });
  }

  // 3. Delegate to billing service
  try {
    await billingService.handleWebhookEvent(event);
  } catch (err) {
    console.error('[POST /api/webhooks/lemonsqueezy] Handler error:', err);
    // Still return 200 to avoid infinite retries for unexpected errors.
    // The error is logged for investigation.
  }

  return new Response('OK', { status: 200 });
}
