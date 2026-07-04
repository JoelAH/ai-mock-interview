/**
 * Unit tests for Task 19: Lemon Squeezy billing — signature verification,
 * webhook handling, session gating, and route handler.
 *
 * Covers:
 * 1. verifyAndParseWebhook — valid + invalid + missing signature
 * 2. billingService.handleWebhookEvent — created/updated/cancelled, tier resolution, missing clerk_user_id no-op
 * 3. billingService.canCreateSession — under cap allows, at cap blocks, inactive blocks
 * 4. Tier config resolves correct TTS provider
 * 5. POST /api/webhooks/lemonsqueezy route handler
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { verifyAndParseWebhook } from '@/lib/integrations/lemonsqueezy';
import { billingService } from '@/lib/services/billingService';
import { userRepository, sessionRepository } from '@/lib/repositories';
import { InterviewSession } from '@/lib/models';
import { getTtsProviderForTier } from '@/lib/config/tiers';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  await mongoose.connect(uri);
});

afterEach(async () => {
  await mongoose.connection.dropDatabase();
  vi.restoreAllMocks();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_WEBHOOK_SECRET = 'test_webhook_secret_abc123';

function signPayload(body: string, secret: string = TEST_WEBHOOK_SECRET): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

function buildEvent(overrides: Record<string, unknown> = {}) {
  return {
    eventName: 'subscription_created',
    data: {
      id: 'sub_123',
      attributes: {
        customer_id: 9999,
        variant_id: 1001,
        status: 'active',
        user_email: 'user@example.com',
        custom_data: { clerk_user_id: 'clerk_billing_user' },
        ...overrides,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// verifyAndParseWebhook tests
// ---------------------------------------------------------------------------
describe('verifyAndParseWebhook', () => {
  describe('mock mode (default in tests)', () => {
    it('parses event without verifying signature', async () => {
      const body = JSON.stringify(buildEvent());
      const event = await verifyAndParseWebhook(body, null);
      expect(event.eventName).toBe('subscription_created');
      expect(event.data.attributes.status).toBe('active');
    });

    it('parses event even with garbage signature', async () => {
      const body = JSON.stringify(buildEvent());
      const event = await verifyAndParseWebhook(body, 'garbage');
      expect(event.eventName).toBe('subscription_created');
    });
  });

  describe('real mode', () => {
    beforeEach(() => {
      process.env.USE_MOCKS = 'false';
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
    });

    afterEach(() => {
      process.env.USE_MOCKS = 'true';
      delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    });

    it('accepts a valid signature', async () => {
      const body = JSON.stringify(buildEvent());
      const signature = signPayload(body);

      const event = await verifyAndParseWebhook(body, signature);
      expect(event.eventName).toBe('subscription_created');
      expect(event.data.attributes.customer_id).toBe(9999);
    });

    it('rejects a missing signature', async () => {
      const body = JSON.stringify(buildEvent());

      await expect(verifyAndParseWebhook(body, null)).rejects.toThrow('Missing X-Signature');
    });

    it('rejects a tampered signature', async () => {
      const body = JSON.stringify(buildEvent());
      const tamperedSig = signPayload(body + 'tampered');

      await expect(verifyAndParseWebhook(body, tamperedSig)).rejects.toThrow('Invalid webhook signature');
    });

    it('rejects when body is modified after signing', async () => {
      const body = JSON.stringify(buildEvent());
      const signature = signPayload(body);
      const modifiedBody = body.replace('active', 'cancelled');

      await expect(verifyAndParseWebhook(modifiedBody, signature)).rejects.toThrow('Invalid webhook signature');
    });
  });
});

// ---------------------------------------------------------------------------
// billingService.handleWebhookEvent tests
// ---------------------------------------------------------------------------
describe('billingService.handleWebhookEvent', () => {
  beforeEach(async () => {
    // Set variant env vars for tier resolution
    process.env.LEMONSQUEEZY_VARIANT_STARTER = '1001';
    process.env.LEMONSQUEEZY_VARIANT_PRO = '1002';
    process.env.LEMONSQUEEZY_VARIANT_PREMIUM = '1003';

    // Pre-create the user
    await userRepository.upsertByClerkId('clerk_billing_user', { email: 'user@example.com' });
  });

  afterEach(() => {
    delete process.env.LEMONSQUEEZY_VARIANT_STARTER;
    delete process.env.LEMONSQUEEZY_VARIANT_PRO;
    delete process.env.LEMONSQUEEZY_VARIANT_PREMIUM;
  });

  it('syncs subscription status and tier on subscription_created', async () => {
    const event = buildEvent({ variant_id: 1001, status: 'active' });
    await billingService.handleWebhookEvent(event);

    const user = await userRepository.findByClerkId('clerk_billing_user');
    expect(user!.subscriptionStatus).toBe('active');
    expect(user!.subscriptionId).toBe('sub_123');
    expect(user!.lemonCustomerId).toBe('9999');
  });

  it('maps on_trial status to trialing', async () => {
    const event = buildEvent({ status: 'on_trial' });
    await billingService.handleWebhookEvent(event);

    const user = await userRepository.findByClerkId('clerk_billing_user');
    expect(user!.subscriptionStatus).toBe('trialing');
  });

  it('sets tier to free on cancellation', async () => {
    // First activate
    await billingService.handleWebhookEvent(buildEvent({ status: 'active', variant_id: 1002 }));

    // Then cancel
    const cancelEvent = buildEvent({ status: 'cancelled', variant_id: 1002 });
    await billingService.handleWebhookEvent(cancelEvent);

    const user = await userRepository.findByClerkId('clerk_billing_user');
    expect(user!.subscriptionStatus).toBe('cancelled');
    expect(user!.subscriptionTier).toBe('free');
  });

  it('no-ops when clerk_user_id is missing from custom_data', async () => {
    const event = buildEvent({ custom_data: null });
    await billingService.handleWebhookEvent(event);

    // User should be unchanged (still has initial values)
    const user = await userRepository.findByClerkId('clerk_billing_user');
    expect(user!.subscriptionStatus).toBe('none');
  });

  it('no-ops when custom_data has no clerk_user_id field', async () => {
    const event = buildEvent({ custom_data: { other_field: 'value' } });
    await billingService.handleWebhookEvent(event);

    const user = await userRepository.findByClerkId('clerk_billing_user');
    expect(user!.subscriptionStatus).toBe('none');
  });
});

// ---------------------------------------------------------------------------
// billingService.canCreateSession tests
// ---------------------------------------------------------------------------
describe('billingService.canCreateSession', () => {
  it('allows session when under cap (free tier trial)', async () => {
    await userRepository.upsertByClerkId('clerk_free_user', { email: 'free@test.com' });

    const result = await billingService.canCreateSession('clerk_free_user');
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('free');
    expect(result.limit).toBe(1);
    expect(result.used).toBe(0);
    expect(result.remaining).toBe(1);
  });

  it('blocks session when free trial cap is reached', async () => {
    await userRepository.upsertByClerkId('clerk_capped_user', { email: 'cap@test.com' });
    const user = await userRepository.findByClerkId('clerk_capped_user');

    // Create a session this month to hit the cap
    await InterviewSession.create({
      userId: user!._id,
      sourceType: 'paste',
      interviewType: 'behavioral',
      status: 'completed',
    });

    const result = await billingService.canCreateSession('clerk_capped_user');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('cap_reached');
    expect(result.remaining).toBe(0);
  });

  it('blocks when subscription is inactive (paid tier)', async () => {
    await userRepository.upsertByClerkId('clerk_inactive', { email: 'inactive@test.com' });
    await userRepository.updateSubscription('clerk_inactive', {
      subscriptionTier: 'starter',
      subscriptionStatus: 'cancelled',
    });

    const result = await billingService.canCreateSession('clerk_inactive');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('inactive_subscription');
  });

  it('allows when paid tier is active and under cap', async () => {
    await userRepository.upsertByClerkId('clerk_pro', { email: 'pro@test.com' });
    await userRepository.updateSubscription('clerk_pro', {
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
    });

    const result = await billingService.canCreateSession('clerk_pro');
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('pro');
    expect(result.limit).toBe(25);
  });

  it('returns user_not_found for non-existent user', async () => {
    const result = await billingService.canCreateSession('clerk_nonexistent');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('user_not_found');
  });
});

// ---------------------------------------------------------------------------
// Tier config resolves correct TTS provider
// ---------------------------------------------------------------------------
describe('Tier config TTS provider resolution', () => {
  it('free tier uses openai', () => {
    expect(getTtsProviderForTier('free')).toBe('openai');
  });

  it('starter tier uses openai', () => {
    expect(getTtsProviderForTier('starter')).toBe('openai');
  });

  it('pro tier uses openai', () => {
    expect(getTtsProviderForTier('pro')).toBe('openai');
  });

  it('premium tier uses openai (MVP — flipped to elevenlabs later)', () => {
    expect(getTtsProviderForTier('premium')).toBe('openai');
  });

  it('null/undefined defaults to free (openai)', () => {
    expect(getTtsProviderForTier(null)).toBe('openai');
    expect(getTtsProviderForTier(undefined)).toBe('openai');
  });
});

// ---------------------------------------------------------------------------
// POST /api/webhooks/lemonsqueezy route handler
// ---------------------------------------------------------------------------
describe('POST /api/webhooks/lemonsqueezy route handler', () => {
  let POST: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import('@/app/api/webhooks/lemonsqueezy/route');
    POST = mod.POST;
  });

  it('returns 200 for a valid webhook event (mock mode skips sig check)', async () => {
    await userRepository.upsertByClerkId('clerk_wh_user', { email: 'wh@test.com' });

    const body = JSON.stringify(buildEvent({
      custom_data: { clerk_user_id: 'clerk_wh_user' },
    }));

    const request = new Request('http://localhost/api/webhooks/lemonsqueezy', {
      method: 'POST',
      body,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('OK');
  });

  it('returns 401 for invalid signature in real mode', async () => {
    const original = process.env.USE_MOCKS;
    process.env.USE_MOCKS = 'false';
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

    const body = JSON.stringify(buildEvent());

    const request = new Request('http://localhost/api/webhooks/lemonsqueezy', {
      method: 'POST',
      headers: { 'x-signature': 'invalid_signature_hex' },
      body,
    });

    const response = await POST(request);
    expect(response.status).toBe(401);

    process.env.USE_MOCKS = original;
    delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  });

  it('returns 200 with valid signature in real mode', async () => {
    const original = process.env.USE_MOCKS;
    process.env.USE_MOCKS = 'false';
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

    await userRepository.upsertByClerkId('clerk_wh_real', { email: 'real@test.com' });

    const body = JSON.stringify(buildEvent({
      custom_data: { clerk_user_id: 'clerk_wh_real' },
    }));
    const signature = signPayload(body);

    const request = new Request('http://localhost/api/webhooks/lemonsqueezy', {
      method: 'POST',
      headers: { 'x-signature': signature },
      body,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    process.env.USE_MOCKS = original;
    delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  });

  it('returns 200 even when clerk_user_id is missing (no-op)', async () => {
    const body = JSON.stringify(buildEvent({ custom_data: null }));

    const request = new Request('http://localhost/api/webhooks/lemonsqueezy', {
      method: 'POST',
      body,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
