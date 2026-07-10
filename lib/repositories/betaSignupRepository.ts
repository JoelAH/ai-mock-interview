import { BetaSignup } from '@/lib/models';
import { dbConnect } from '@/lib/db';

export const betaSignupRepository = {
  /** Insert an email. Returns the doc (existing or newly created). */
  async upsertEmail(email: string) {
    await dbConnect();
    return BetaSignup.findOneAndUpdate(
      { email },
      { $setOnInsert: { email, source: 'landing' } },
      { upsert: true, returnDocument: 'after', lean: true },
    );
  },
};
