import { z } from 'zod';

export const subscriptionStatusEnum = z.enum([
  'active',
  'cancelled',
  'past_due',
  'paused',
  'trialing',
  'none',
]);

export const subscriptionTierEnum = z.enum(['free', 'starter', 'pro', 'premium']);

export type SubscriptionStatus = z.infer<typeof subscriptionStatusEnum>;
export type SubscriptionTierName = z.infer<typeof subscriptionTierEnum>;

export const subscriptionSourceEnum = z.enum(['lemonsqueezy', 'apple']).nullable();
export type SubscriptionSource = z.infer<typeof subscriptionSourceEnum>;

export const userSchema = z.object({
  clerkUserId: z.string().min(1),
  email: z.string().email(),
  lemonCustomerId: z.string().nullable().default(null),
  subscriptionStatus: subscriptionStatusEnum.default('none'),
  subscriptionTier: subscriptionTierEnum.default('free'),
  subscriptionId: z.string().nullable().default(null),
  subscriptionSource: subscriptionSourceEnum.default(null),
  revenuecatSubscriptionId: z.string().nullable().default(null),
  appleSubscriptionTier: subscriptionTierEnum.nullable().default(null),
  appleSubscriptionStatus: subscriptionStatusEnum.nullable().default(null),
  /** Admin override — when true, user gets premium access regardless of subscription state. */
  subscriptionOverride: z.boolean().default(false),
});

export type UserDTO = z.infer<typeof userSchema>;
