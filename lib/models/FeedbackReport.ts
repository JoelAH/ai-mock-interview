import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const feedbackReportSchema = new Schema(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'InterviewSession',
      required: true,
      unique: true,
      index: true,
    },
    overallScore: { type: Number, required: true, min: 0, max: 100 },
    technicalAccuracyScore: { type: Number, required: true, min: 0, max: 100 },
    communicationScore: { type: Number, required: true, min: 0, max: 100 },
    structureScore: { type: Number, required: true, min: 0, max: 100 },
    synthesizedInsight: { type: String, required: true },
  },
  { timestamps: true },
);

export type IFeedbackReport = InferSchemaType<typeof feedbackReportSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const FeedbackReport =
  mongoose.models.FeedbackReport ||
  mongoose.model('FeedbackReport', feedbackReportSchema);
