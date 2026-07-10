import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const betaSignupSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    source: { type: String, default: 'landing' },
  },
  { timestamps: true },
);

export type IBetaSignup = InferSchemaType<typeof betaSignupSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const BetaSignup =
  mongoose.models.BetaSignup || mongoose.model('BetaSignup', betaSignupSchema);
