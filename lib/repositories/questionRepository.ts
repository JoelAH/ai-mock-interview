import { InterviewQuestion } from '@/lib/models';
import { dbConnect } from '@/lib/db';
import type { InterviewQuestionDTO } from '@/lib/schemas';

export const questionRepository = {
  async create(data: InterviewQuestionDTO) {
    await dbConnect();
    return InterviewQuestion.create(data);
  },

  async findBySessionId(sessionId: string) {
    await dbConnect();
    return InterviewQuestion.find({ sessionId }).sort({ order: 1 }).lean();
  },

  async findById(id: string) {
    await dbConnect();
    return InterviewQuestion.findById(id).lean();
  },

  async setAnswer(id: string, answerTranscript: string) {
    await dbConnect();
    return InterviewQuestion.findByIdAndUpdate(
      id,
      { $set: { answerTranscript } },
      { returnDocument: 'after', lean: true },
    );
  },

  async setScores(id: string, scores: InterviewQuestionDTO['scores'], strongAnswerNotes: string) {
    await dbConnect();
    return InterviewQuestion.findByIdAndUpdate(
      id,
      { $set: { scores, strongAnswerNotes } },
      { returnDocument: 'after', lean: true },
    );
  },
};
