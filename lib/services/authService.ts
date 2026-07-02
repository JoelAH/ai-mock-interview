import { userRepository } from '@/lib/repositories';
import type { IUser } from '@/lib/models';

/**
 * Auth service — framework-agnostic user resolution.
 *
 * Route handlers call `resolveUser(clerkUserId)` after verifying the JWT.
 * This ensures any client (web, mobile, desktop) using bearer tokens
 * gets identical user lookup behavior without duplicating logic.
 */

export const authService = {
  /**
   * Resolves the local user document for a verified Clerk user ID.
   * Returns the user if found, or null if not yet synced via webhook.
   */
  async resolveUser(clerkUserId: string): Promise<IUser | null> {
    if (!clerkUserId) {
      return null;
    }

    const user = await userRepository.findByClerkId(clerkUserId);
    return (user as IUser) ?? null;
  },
};
