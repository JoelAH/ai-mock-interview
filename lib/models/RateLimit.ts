import mongoose, { Schema, type InferSchemaType } from 'mongoose';

/**
 * Rate limit bucket — tracks request counts per (key, window).
 *
 * Each document represents one sliding-window bucket.
 * MongoDB TTL index auto-deletes expired buckets so the collection
 * stays lean with no manual cleanup needed.
 */
const rateLimitSchema = new Schema({
  /** Composite key: "<route>:<userId>" or "<route>:<ip>" */
  key: { type: String, required: true, unique: true, index: true },
  /** Number of requests in the current window */
  count: { type: Number, required: true, default: 0 },
  /** When this bucket was first created (window start) */
  windowStart: { type: Date, required: true, default: () => new Date() },
  /** TTL field — MongoDB will delete the document after this date */
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export type IRateLimit = InferSchemaType<typeof rateLimitSchema>;

export const RateLimit =
  mongoose.models.RateLimit || mongoose.model('RateLimit', rateLimitSchema);
