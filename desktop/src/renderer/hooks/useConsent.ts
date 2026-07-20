/**
 * Voice recording consent persistence.
 *
 * Stores consent in localStorage keyed by version. If the consent version
 * is bumped (e.g. wording change), prior consent is considered stale and
 * the user must re-consent.
 */

// Must match LEGAL.consentVersion in lib/site.ts on the server.
const CONSENT_VERSION = '2025-02-01';
const STORAGE_KEY = 'devmockview_voice_consent';

interface ConsentRecord {
  version: string;
  grantedAt: string; // ISO timestamp
}

export function hasValidConsent(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const record: ConsentRecord = JSON.parse(raw);
    return record.version === CONSENT_VERSION;
  } catch {
    return false;
  }
}

export function grantConsent(): void {
  const record: ConsentRecord = {
    version: CONSENT_VERSION,
    grantedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

export function revokeConsent(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getConsentVersion(): string {
  return CONSENT_VERSION;
}
