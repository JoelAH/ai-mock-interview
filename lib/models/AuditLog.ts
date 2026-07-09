import mongoose, { Schema, type InferSchemaType } from 'mongoose';

/**
 * Audit log — records every webhook event and significant billing action.
 *
 * Useful for debugging subscription issues, customer support, and
 * understanding event ordering. TTL can be added later if retention
 * needs to be capped.
 */
const auditLogSchema = new Schema(
  {
    /** Source of the event: 'lemonsqueezy', 'clerk', 'system' */
    source: { type: String, required: true, index: true },
    /** Event name (e.g. 'subscription_created', 'subscription_cancelled') */
    eventName: { type: String, required: true, index: true },
    /** Clerk user ID if resolved (null if we couldn't map the event to a user) */
    clerkUserId: { type: String, default: null, index: true },
    /** The full event payload (stored as a flexible object for debugging) */
    payload: { type: Schema.Types.Mixed, default: null },
    /** Outcome of processing: 'success', 'skipped', 'error' */
    outcome: { type: String, enum: ['success', 'skipped', 'error'], default: 'success' },
    /** Human-readable note about what happened */
    note: { type: String, default: '' },
  },
  { timestamps: true },
);

export type IAuditLog = InferSchemaType<typeof auditLogSchema>;

export const AuditLog =
  mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
