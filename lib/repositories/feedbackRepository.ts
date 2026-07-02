import { FeedbackReport } from '@/lib/models';
import { dbConnect } from '@/lib/db';
import type { FeedbackReportDTO } from '@/lib/schemas';

export const feedbackRepository = {
  async create(data: FeedbackReportDTO) {
    await dbConnect();
    return FeedbackReport.create(data);
  },

  async findBySessionId(sessionId: string) {
    await dbConnect();
    return FeedbackReport.findOne({ sessionId }).lean();
  },
};
