/**
 * Billing Service — subscription tier resolution, session-cap gating,
 * and Lemon Squeezy webhook handling.
 *
 * Framework-agnostic: no HTTP or Next.js imports.
 * The gating function is reusable by any client's route handler.
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

    const tier = (user.subscriptionTier ?? 'free') as SubscriptionTier;
    const config = getTierConfig(tier);
    const limit = config.sessionsPerMonth;

    // Free tier is the no-subscription trial: allowed until the trial cap is hit,
    // no active-subscription requirement. Paid tiers require an active status.
    const status = user.subscriptionStatus ?? 'none';
    const requiresActiveSub = tier !== 'free';
    if (requiresActiveSub && !ACTIVE_STATUSES.has(status)) {
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
    const tier = (user?.subscriptionTier ?? 'free') as SubscriptionTier;
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
};
