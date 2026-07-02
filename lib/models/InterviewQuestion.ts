import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const interviewQuestionSchema = new Schema(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'InterviewSession', required: true, index: true },
    text: { type: String, required: true },
    type: {
      type: String,
      enum: ['behavioral', 'architectural', 'follow_up', 'rescue'],
      required: true,
    },
    order: { type: Number, required: true },
    isFollowUp: { type: Boolean, default: false },
    answerTranscript: { type: String, default: '' },
    scores: {
      type: Schema.Types.Mixed,
      default: null,
    },
    strongAnswerNotes: { type: String, default: '' },
  },
  { timestamps: true },
);

export type IInterviewQuestion = InferSchemaType<typeof interviewQuestionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const InterviewQuestion =
  mongoose.models.InterviewQuestion ||
  mongoose.model('InterviewQuestion', interviewQuestionSchema);
