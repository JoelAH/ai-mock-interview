import 'server-only';

/**
 * Subscription tier configuration.
 *
 * Single source of truth for pricing, monthly session caps, and which TTS
 * provider each tier uses. Framework-agnostic — imported by services,
 * billing logic, and the TTS factory.
 *
 * MVP note: all tiers use OpenAI TTS at launch. Flip Premium to 'elevenlabs'
 * here (one line) to enable the premium voice — no other code changes needed.
 */

/** The subscription tiers offered. `free` covers trial / no-subscription users. */
export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'premium';

/** TTS providers the app can resolve to per tier. */
export type TtsProvider = 'deepgram' | 'openai' | 'elevenlabs';

export interface TierConfig {
  /** Tier identifier */
  tier: SubscriptionTier;
  /** Display name */
  label: string;
  /** Monthly price in USD (0 for free/trial) */
  priceUsd: number;
  /** Max interview sessions allowed per calendar month */
  sessionsPerMonth: number;
  /** TTS provider used for this tier's interviews */
  ttsProvider: TtsProvider;
  /** Lemon Squeezy variant ID (populated from env; null for free) */
  lemonVariantId: string | null;
}

/**
 * The tier map. Lemon Squeezy variant IDs come from env so the same code
 * works across dev/prod stores.
 */
export const tierConfigs: Record<SubscriptionTier, TierConfig> = {
  free: {
    tier: 'free',
    label: 'Free Trial',
    priceUsd: 0,
    sessionsPerMonth: 2, // trial sessions before a subscription is required
    ttsProvider: 'deepgram',
    lemonVariantId: null,
  },
  starter: {
    tier: 'starter',
    label: 'Starter',
    priceUsd: 19,
    sessionsPerMonth: 10,
    ttsProvider: 'deepgram',
    lemonVariantId: process.env.LEMONSQUEEZY_VARIANT_STARTER ?? null,
  },
  pro: {
    tier: 'pro',
    label: 'Pro',
    priceUsd: 39,
    sessionsPerMonth: 25,
    ttsProvider: 'deepgram',
    lemonVariantId: process.env.LEMONSQUEEZY_VARIANT_PRO ?? null,
  },
  premium: {
    tier: 'premium',
    label: 'Premium',
    priceUsd: 79,
    sessionsPerMonth: 60,
    // MVP: Deepgram TTS. Change to 'elevenlabs' to enable the premium voice.
    ttsProvider: 'deepgram',
    lemonVariantId: process.env.LEMONSQUEEZY_VARIANT_PREMIUM ?? null,
  },
};

/** All valid tier identifiers (useful for Zod enums). */
export const SUBSCRIPTION_TIERS = Object.keys(tierConfigs) as SubscriptionTier[];

/** Returns the config for a tier, defaulting to the free tier if unknown. */
export function getTierConfig(tier: SubscriptionTier | null | undefined): TierConfig {
  if (tier && tierConfigs[tier]) {
    return tierConfigs[tier];
  }
  return tierConfigs.free;
}

/** Resolves the TTS provider for a given tier. */
export function getTtsProviderForTier(tier: SubscriptionTier | null | undefined): TtsProvider {
  return getTierConfig(tier).ttsProvider;
}

/** Resolves the monthly session cap for a given tier. */
export function getSessionCapForTier(tier: SubscriptionTier | null | undefined): number {
  return getTierConfig(tier).sessionsPerMonth;
}

/**
 * Resolves a subscription tier from a Lemon Squeezy variant ID.
 * Returns null if no tier matches (caller decides how to handle).
 */
export function resolveTierFromVariantId(variantId: string): SubscriptionTier | null {
  for (const config of Object.values(tierConfigs)) {
    if (config.lemonVariantId && config.lemonVariantId === variantId) {
      return config.tier;
    }
  }
  return null;
}
