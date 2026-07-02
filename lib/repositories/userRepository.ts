import { User } from '@/lib/models';
import { dbConnect } from '@/lib/db';
import type { UserDTO } from '@/lib/schemas';

export const userRepository = {
  async findByClerkId(clerkUserId: string) {
    await dbConnect();
    return User.findOne({ clerkUserId }).lean();
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
    fields: Pick<UserDTO, 'subscriptionStatus' | 'subscriptionId' | 'lemonCustomerId'>,
  ) {
    await dbConnect();
    return User.findOneAndUpdate({ clerkUserId }, { $set: fields }, { returnDocument: 'after', lean: true });
  },
};
