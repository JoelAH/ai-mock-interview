/**
 * Billing Service — subscription tier resolution, session-cap gating,
 * and webhook handling for both Lemon Squeezy and RevenueCat (Apple IAP).
 *
 * Framework-agnostic: no HTTP or Next.js imports.
 * The gating function is reusable by any client's route handler.
 *
 * Entitlement unification strategy:
 * - Lemon Squeezy updates subscriptionTier/subscriptionStatus directly
 * - RevenueCat updates appleSubscriptionTier/appleSubscriptionStatus
 * - canCreateSession() resolves the effective tier as the HIGHER of the two sources
 * - subscriptionSource tracks which source is currently "winning"
 */
import { userRepository, sessionRepository } from '@/lib/repositories';
import {
  getTierConfig,
  getTtsProviderForTier,
  resolveTierFromVariantId,
  type SubscriptionTier,
  type TtsProvider,
} from '@/lib/config/tiers';
import type { LemonSqueezyEvent } from '@/lib/integrations';
import type { SubscriptionStatus } from '@/lib/schemas';
import { audit } from '@/lib/services/auditService';

/** Statuses that grant access to create sessions. */
const ACTIVE_STATUSES = new Set(['active', 'trialing']);

/** Tier priority for unification: higher index = higher tier. */
const TIER_PRIORITY: Record<SubscriptionTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  premium: 3,
};

/** RevenueCat product ID → tier mapping */
const REVENUECAT_PRODUCT_MAP: Record<string, SubscriptionTier> = {
  'com.devmockview.starter.monthly': 'starter',
  'com.devmockview.pro.monthly': 'pro',
  'com.devmockview.premium.monthly': 'premium',
};

/** RevenueCat webhook event shape (subset we need) */
export interface RevenueCatEvent {
  type: string;
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

export interface SessionAllowance {
  /** Whether the user may start a new session right now */
  allowed: boolean;
  /** The user's current tier */
  tier: SubscriptionTier;
  /** Sessions used this calendar month */
  used: number;
  /** Monthly cap for the tier */
  limit: number;
  /** Sessions remaining this month (never negative) */
  remaining: number;
  /** Reason when not allowed (for surfacing to the client) */
  reason?: 'cap_reached' | 'inactive_subscription' | 'user_not_found';
}

export interface IBillingService {
  /**
   * Resolves whether a user can create a new interview session, based on
   * subscription status and the current month's usage vs their tier cap.
   */
  canCreateSession(clerkUserId: string): Promise<SessionAllowance>;

  /**
   * Resolves the TTS provider a user's sessions should use, based on tier.
   */
  resolveTtsProvider(clerkUserId: string): Promise<TtsProvider>;

  /**
   * Processes a Lemon Squeezy subscription lifecycle event and syncs
   * status + tier onto the user doc.
   */
  handleWebhookEvent(event: LemonSqueezyEvent): Promise<void>;

  /**
   * Processes a RevenueCat (Apple IAP) subscription lifecycle event and syncs
   * Apple subscription status onto the user doc.
   */
  handleRevenueCatEvent(event: RevenueCatEvent): Promise<void>;

  /**
   * Returns which subscription source is currently active for a user.
   * Used by the UI to show "via App Store" or "via Web".
   */
  getSubscriptionSource(clerkUserId: string): Promise<'apple' | 'lemonsqueezy' | null>;
}

/**
 * Maps a Lemon Squeezy subscription status string to our internal enum.
 * Lemon Squeezy uses: active, paused, past_due, unpaid, cancelled, expired, on_trial.
 */
function mapLemonStatus(lemonStatus: string): SubscriptionStatus {
  switch (lemonStatus) {
    case 'active':
      return 'active';
    case 'on_trial':
      return 'trialing';
    case 'paused':
      return 'paused';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'cancelled':
    case 'expired':
      return 'cancelled';
    default:
      return 'none';
  }
}

export const billingService: IBillingService = {
  async canCreateSession(clerkUserId: string): Promise<SessionAllowance> {
    const user = await userRepository.findByClerkId(clerkUserId);

    if (!user) {
      return {
        allowed: false,
        tier: 'free',
        used: 0,
        limit: 0,
        remaining: 0,
        reason: 'user_not_found',
      };
    }

    // Resolve the effective tier — highest between Lemon Squeezy and Apple
    const tier = resolveEffectiveTier(user);
    const config = getTierConfig(tier);
    const limit = config.sessionsPerMonth;

    // Check if either subscription source is active
    const lsStatus = (user.subscriptionStatus ?? 'none') as string;
    const appleStatus = (user.appleSubscriptionStatus ?? 'none') as string;
    const hasActiveSub = ACTIVE_STATUSES.has(lsStatus) || ACTIVE_STATUSES.has(appleStatus);

    // Free tier is the no-subscription trial: allowed until the trial cap is hit,
    // no active-subscription requirement. Paid tiers require an active status.
    const requiresActiveSub = tier !== 'free';
    if (requiresActiveSub && !hasActiveSub) {
      return {
        allowed: false,
        tier,
        used: 0,
        limit,
        remaining: 0,
        reason: 'inactive_subscription',
      };
    }

    const used = await sessionRepository.countByUserThisMonth(String(user._id));
    const remaining = Math.max(0, limit - used);
    const allowed = used < limit;

    return {
      allowed,
      tier,
      used,
      limit,
      remaining,
      reason: allowed ? undefined : 'cap_reached',
    };
  },

  async resolveTtsProvider(clerkUserId: string): Promise<TtsProvider> {
    const user = await userRepository.findByClerkId(clerkUserId);
    const tier = user ? resolveEffectiveTier(user) : 'free';
    return getTtsProviderForTier(tier);
  },

  async handleWebhookEvent(event: LemonSqueezyEvent): Promise<void> {
    const attrs = event.data.attributes;
    const status = mapLemonStatus(String(attrs.status));

    // Resolve the tier from the purchased variant. Fall back to keeping the
    // existing tier if the variant isn't recognized (avoids downgrading on
    // unrelated events).
    const variantId = attrs.variant_id != null ? String(attrs.variant_id) : '';
    const resolvedTier = variantId ? resolveTierFromVariantId(variantId) : null;

    // The webhook payload identifies the customer; we key our users on the
    // clerkUserId stored in custom checkout data (user_email is a fallback).
    let clerkUserId =
      (attrs.custom_data as { clerk_user_id?: string } | undefined)?.clerk_user_id ?? null;

    // Fallback: on lifecycle events (cancel, update, renew) custom_data is often
    // absent. Look up the user by subscriptionId or lemonCustomerId instead.
    if (!clerkUserId) {
      const subscriptionId = event.data.id;
      const lemonCustomerId = attrs.customer_id != null ? String(attrs.customer_id) : null;

      let user = subscriptionId
        ? await userRepository.findBySubscriptionId(subscriptionId)
        : null;

      if (!user && lemonCustomerId) {
        user = await userRepository.findByLemonCustomerId(lemonCustomerId);
      }

      if (user) {
        clerkUserId = (user as { clerkUserId?: string }).clerkUserId ?? null;
      }
    }

    if (!clerkUserId) {
      return;
    }

    const fields: Parameters<typeof userRepository.updateSubscription>[1] = {
      subscriptionStatus: status,
      subscriptionSource: 'lemonsqueezy',
      lemonCustomerId: attrs.customer_id != null ? String(attrs.customer_id) : null,
      subscriptionId: event.data.id,
    };

    // Only change tier when we could resolve one, and drop to 'free' when the
    // subscription is no longer active.
    if (status === 'cancelled' || status === 'none') {
      fields.subscriptionTier = 'free';
    } else if (resolvedTier) {
      fields.subscriptionTier = resolvedTier;
    }

    await userRepository.updateSubscription(clerkUserId, fields);
  },

  async handleRevenueCatEvent(event: RevenueCatEvent): Promise<void> {
    const clerkUserId = event.app_user_id;
    if (!clerkUserId) return;

    const productId = event.product_id;
    const resolvedTier = REVENUECAT_PRODUCT_MAP[productId] ?? null;

    // Map RevenueCat event types to our internal status
    let appleStatus: SubscriptionStatus;
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
        appleStatus = 'active';
        break;
      case 'CANCELLATION':
      case 'EXPIRATION':
        appleStatus = 'cancelled';
        break;
      case 'BILLING_ISSUE_DETECTED':
        appleStatus = 'past_due';
        break;
      default:
        // For other events (SUBSCRIBER_ALIAS, PRODUCT_CHANGE, etc.)
        // default to active if we have a product, otherwise leave unchanged
        appleStatus = resolvedTier ? 'active' : 'none';
    }

    const fields: Parameters<typeof userRepository.updateSubscription>[1] = {
      appleSubscriptionStatus: appleStatus,
      revenuecatSubscriptionId: productId,
    };

    // Set Apple tier
    if (appleStatus === 'cancelled' || appleStatus === 'none') {
      fields.appleSubscriptionTier = 'free';
    } else if (resolvedTier) {
      fields.appleSubscriptionTier = resolvedTier;
    }

    await userRepository.updateSubscription(clerkUserId, fields);
  },

  async getSubscriptionSource(clerkUserId: string): Promise<'apple' | 'lemonsqueezy' | null> {
    const user = await userRepository.findByClerkId(clerkUserId);
    if (!user) return null;

    const lsTier = (user.subscriptionTier ?? 'free') as SubscriptionTier;
    const appleTier = (user.appleSubscriptionTier ?? 'free') as SubscriptionTier;
    const lsActive = ACTIVE_STATUSES.has(user.subscriptionStatus ?? 'none');
    const appleActive = ACTIVE_STATUSES.has(user.appleSubscriptionStatus ?? 'none');

    if (!lsActive && !appleActive) return null;
    if (appleActive && !lsActive) return 'apple';
    if (lsActive && !appleActive) return 'lemonsqueezy';

    // Both active — return whichever has the higher tier
    return TIER_PRIORITY[appleTier] >= TIER_PRIORITY[lsTier] ? 'apple' : 'lemonsqueezy';
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolves the effective subscription tier from both sources.
 * The higher tier wins when a user has subscriptions from both platforms.
 */
function resolveEffectiveTier(user: Record<string, unknown>): SubscriptionTier {
  const lsTier = (user.subscriptionTier ?? 'free') as SubscriptionTier;
  const appleTier = (user.appleSubscriptionTier ?? 'free') as SubscriptionTier;

  const lsActive = ACTIVE_STATUSES.has((user.subscriptionStatus as string) ?? 'none');
  const appleActive = ACTIVE_STATUSES.has((user.appleSubscriptionStatus as string) ?? 'none');

  const effectiveLs = lsActive ? lsTier : 'free';
  const effectiveApple = appleActive ? appleTier : 'free';

  return TIER_PRIORITY[effectiveApple] >= TIER_PRIORITY[effectiveLs] ? effectiveApple : effectiveLs;
}
