import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const interviewSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceType: {
      type: String,
      enum: ['paste', 'preset'],
      required: true,
    },
    jdText: { type: String, default: '' },
    parsedSignals: {
      type: Schema.Types.Mixed,
      default: null,
    },
    interviewType: {
      type: String,
      enum: ['behavioral', 'technical', 'architectural', 'mix'],
      required: true,
    },
    status: {
      type: String,
      enum: ['setup', 'in_progress', 'completed', 'abandoned'],
      default: 'setup',
      index: true,
    },
    overallScore: { type: Number, default: null, min: 0, max: 100 },
  },
  { timestamps: true },
);

export type IInterviewSession = InferSchemaType<typeof interviewSessionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const InterviewSession =
  mongoose.models.InterviewSession ||
  mongoose.model('InterviewSession', interviewSessionSchema);
