import { z } from 'zod';

export const subscriptionStatusEnum = z.enum([
  'active',
  'cancelled',
  'past_due',
  'paused',
  'trialing',
  'none',
]);

export const userSchema = z.object({
  clerkUserId: z.string().min(1),
  email: z.string().email(),
  lemonCustomerId: z.string().nullable().default(null),
  subscriptionStatus: subscriptionStatusEnum.default('none'),
  subscriptionId: z.string().nullable().default(null),
});

export type UserDTO = z.infer<typeof userSchema>;
