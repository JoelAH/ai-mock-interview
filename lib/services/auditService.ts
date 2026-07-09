import 'server-only';

import { AuditLog } from '@/lib/models';
import { dbConnect } from '@/lib/db';

export interface AuditEntry {
  source: 'lemonsqueezy' | 'clerk' | 'system';
  eventName: string;
  clerkUserId?: string | null;
  payload?: unknown;
  outcome?: 'success' | 'skipped' | 'error';
  note?: string;
}

/**
 * Writes an entry to the audit log. Fire-and-forget — never throws
 * to avoid breaking the webhook handler if logging fails.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await dbConnect();
    await AuditLog.create({
      source: entry.source,
      eventName: entry.eventName,
      clerkUserId: entry.clerkUserId ?? null,
      payload: entry.payload ?? null,
      outcome: entry.outcome ?? 'success',
      note: entry.note ?? '',
    });
  } catch (err) {
    // Never let audit logging break the main flow
    console.error('[AuditService] Failed to write audit log:', err);
  }
}
