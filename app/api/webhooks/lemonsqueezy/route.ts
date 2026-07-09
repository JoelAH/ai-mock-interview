import { verifyAndParseWebhook } from '@/lib/integrations';
import { billingService } from '@/lib/services';
import { audit } from '@/lib/services/auditService';

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
    await audit({
      source: 'lemonsqueezy',
      eventName: 'verification_failed',
      outcome: 'error',
      note: `Signature verification failed: ${err instanceof Error ? err.message : String(err)}`,
    });
    return new Response('Invalid signature', { status: 401 });
  }

  const clerkUserId =
    (event.data.attributes.custom_data as { clerk_user_id?: string } | undefined)?.clerk_user_id ?? null;

  // 3. Delegate to billing service
  try {
    await billingService.handleWebhookEvent(event);
    await audit({
      source: 'lemonsqueezy',
      eventName: event.eventName,
      clerkUserId,
      payload: {
        subscriptionId: event.data.id,
        variantId: event.data.attributes.variant_id,
        status: event.data.attributes.status,
        customerId: event.data.attributes.customer_id,
      },
      outcome: 'success',
      note: `Processed ${event.eventName} — variant ${event.data.attributes.variant_id}, status ${event.data.attributes.status}`,
    });
  } catch (err) {
    await audit({
      source: 'lemonsqueezy',
      eventName: event.eventName,
      clerkUserId,
      payload: {
        subscriptionId: event.data.id,
        variantId: event.data.attributes.variant_id,
        status: event.data.attributes.status,
        customerId: event.data.attributes.customer_id,
      },
      outcome: 'error',
      note: `Handler error: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  return new Response('OK', { status: 200 });
}
