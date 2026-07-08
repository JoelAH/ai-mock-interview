import { InterviewSession } from '@/lib/models';
import { dbConnect } from '@/lib/db';
import type { InterviewSessionDTO } from '@/lib/schemas';

export const sessionRepository = {
  async create(data: InterviewSessionDTO) {
    await dbConnect();
    return InterviewSession.create(data);
  },

  async findById(id: string) {
    await dbConnect();
    return InterviewSession.findById(id).lean();
  },

  async findByUserId(userId: string) {
    await dbConnect();
    return InterviewSession.find({ userId }).sort({ createdAt: -1 }).lean();
  },

  /**
   * Counts sessions created by a user in the current calendar month (UTC).
   * Used to enforce per-tier monthly session caps.
   */
  async countByUserThisMonth(userId: string, now: Date = new Date()): Promise<number> {
    await dbConnect();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return InterviewSession.countDocuments({
      userId,
      createdAt: { $gte: startOfMonth },
      status: { $in: ['in_progress', 'completed', 'abandoned'] },
    });
  },

  async updateStatus(id: string, status: InterviewSessionDTO['status']) {
    await dbConnect();
    return InterviewSession.findByIdAndUpdate(id, { $set: { status } }, { returnDocument: 'after', lean: true });
  },

  async setOverallScore(id: string, overallScore: number) {
    await dbConnect();
    return InterviewSession.findByIdAndUpdate(
      id,
      { $set: { overallScore } },
      { returnDocument: 'after', lean: true },
    );
  },

  async setParsedSignals(id: string, parsedSignals: InterviewSessionDTO['parsedSignals']) {
    await dbConnect();
    return InterviewSession.findByIdAndUpdate(
      id,
      { $set: { parsedSignals } },
      { returnDocument: 'after', lean: true },
    );
  },
};
