import { User } from '@/lib/models';
import { dbConnect } from '@/lib/db';
import type { UserDTO } from '@/lib/schemas';

export const userRepository = {
  async findByClerkId(clerkUserId: string) {
    await dbConnect();
    return User.findOne({ clerkUserId }).lean();
  },

  async findBySubscriptionId(subscriptionId: string) {
    await dbConnect();
    return User.findOne({ subscriptionId }).lean();
  },

  async findByLemonCustomerId(lemonCustomerId: string) {
    await dbConnect();
    return User.findOne({ lemonCustomerId }).lean();
  },

  async upsertByClerkId(clerkUserId: string, data: Partial<UserDTO>) {
    await dbConnect();
    return User.findOneAndUpdate(
      { clerkUserId },
      { $set: { clerkUserId, ...data } },
      { upsert: true, returnDocument: 'after', lean: true },
    );
  },

  async deleteByClerkId(clerkUserId: string) {
    await dbConnect();
    return User.deleteOne({ clerkUserId });
  },

  async updateSubscription(
    clerkUserId: string,
    fields: Partial<
      Pick<UserDTO, 'subscriptionStatus' | 'subscriptionTier' | 'subscriptionId' | 'lemonCustomerId'>
    >,
  ) {
    await dbConnect();
    return User.findOneAndUpdate({ clerkUserId }, { $set: fields }, { returnDocument: 'after', lean: true });
  },
};
