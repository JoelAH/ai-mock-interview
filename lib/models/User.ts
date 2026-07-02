import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    clerkUserId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    lemonCustomerId: { type: String, default: null },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'cancelled', 'past_due', 'paused', 'trialing', 'none'],
      default: 'none',
    },
    subscriptionId: { type: String, default: null },
  },
  { timestamps: true },
);

export type IUser = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };

export const User = mongoose.models.User || mongoose.model('User', userSchema);
