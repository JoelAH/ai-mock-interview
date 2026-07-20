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
    subscriptionTier: {
      type: String,
      enum: ['free', 'starter', 'pro', 'premium'],
      default: 'free',
    },
    subscriptionId: { type: String, default: null },
    // Subscription source tracking — identifies which platform the active sub came from
    subscriptionSource: {
      type: String,
      enum: ['lemonsqueezy', 'apple', null],
      default: null,
    },
    // Apple / RevenueCat subscription fields
    revenuecatSubscriptionId: { type: String, default: null },
    appleSubscriptionTier: {
      type: String,
      enum: ['free', 'starter', 'pro', 'premium', null],
      default: null,
    },
    appleSubscriptionStatus: {
      type: String,
      enum: ['active', 'cancelled', 'past_due', 'paused', 'trialing', 'none', null],
      default: null,
    },
  },
  { timestamps: true },
);

export type IUser = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };

export const User = mongoose.models.User || mongoose.model('User', userSchema);
