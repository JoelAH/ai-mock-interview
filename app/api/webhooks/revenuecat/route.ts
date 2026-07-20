import { billingService } from '@/lib/services';
import { audit } from '@/lib/services/auditService';

/**
 * POST /api/webhooks/revenuecat
 *
 * Handles RevenueCat server-to-server webhook events for Apple In-App Purchase
 * subscription lifecycle (initial purchase, renewal, cancellation, expiration, billing issues).
 *
 * RevenueCat authenticates webhooks via an Authorization header containing the
 * webhook auth key configured in the RevenueCat dashboard.
 *
 * This route is public (matched by the webhooks exclusion in middleware).
 */

// RevenueCat event types we handle
type RevenueCatEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'CANCELLATION'
  | 'EXPIRATION'
  | 'BILLING_ISSUE_DETECTED'
  | 'SUBSCRIBER_ALIAS'
  | 'PRODUCT_CHANGE'
  | 'NON_RENEWING_PURCHASE';

interface RevenueCatEvent {
  type: RevenueCatEventType;
  app_user_id: string;
  product_id: string;
  entitlement_ids?: string[];
  store: string;
  environment: string;
  purchased_at_ms: number;
  expiration_at_ms: number | null;
  event_timestamp_ms: number;
  is_trial_conversion?: boolean;
  cancel_reason?: string;
}

interface RevenueCatWebhookBody {
  api_version: string;
  event: RevenueCatEvent;
}

export async function POST(request: Request) {
  // 1. Verify webhook authorization
  const authHeader = request.headers.get('authorization');
  const expectedKey = process.env.REVENUECAT_WEBHOOK_AUTH_KEY;

  if (!expectedKey) {
    console.error('[RevenueCat Webhook] REVENUECAT_WEBHOOK_AUTH_KEY not configured');
    return new Response('Server configuration error', { status: 500 });
  }

  // RevenueCat sends: Authorization: Bearer <key>
  const providedKey = authHeader?.replace('Bearer ', '');
  if (!providedKey || providedKey !== expectedKey) {
    await audit({
      source: 'revenuecat',
      eventName: 'verification_failed',
      outcome: 'error',
      note: 'Invalid or missing authorization header',
    });
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Parse request body
  let body: RevenueCatWebhookBody;
  try {
    body = (await request.json()) as RevenueCatWebhookBody;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { event } = body;
  if (!event || !event.app_user_id) {
    return new Response('Missing event or app_user_id', { status: 400 });
  }

  // 3. Delegate to billing service
  const clerkUserId = event.app_user_id;

  try {
    await billingService.handleRevenueCatEvent(event);
    await audit({
      source: 'revenuecat',
      eventName: event.type,
      clerkUserId,
      payload: {
        productId: event.product_id,
        store: event.store,
        environment: event.environment,
        expirationAtMs: event.expiration_at_ms,
        entitlementIds: event.entitlement_ids,
      },
      outcome: 'success',
      note: `Processed ${event.type} — product ${event.product_id}, store ${event.store}`,
    });
  } catch (err) {
    await audit({
      source: 'revenuecat',
      eventName: event.type,
      clerkUserId,
      payload: {
        productId: event.product_id,
        store: event.store,
        environment: event.environment,
      },
      outcome: 'error',
      note: `Handler error: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // Always return 200 to prevent RevenueCat from retrying
  return new Response('OK', { status: 200 });
}
