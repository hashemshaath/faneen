/**
 * BUSINESS-ADMIN-2 — Sanitization helpers for admin operational notes.
 *
 * Notes are internal-only support log entries. We aggressively reject:
 * - payment / provider secrets (tokens, intent ids, client_secret, …)
 * - synthetic phone-derived emails (`*@phone.qitaat.com`)
 * - raw bearer tokens / JWT-shaped strings
 *
 * For `metadata` we whitelist a small set of keys and drop the rest.
 */

const FORBIDDEN_PATTERNS: RegExp[] = [
  /provider_intent_id/i,
  /client_secret/i,
  /access_token/i,
  /refresh_token/i,
  /bearer\s+[A-Za-z0-9._-]{16,}/i,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}/, // JWT-shaped
  /@phone\.[a-z.]+/i, // synthetic phone-derived emails
];

export const OFFICIAL_REF = /^[A-Z]{2,6}-[A-Z0-9]+$/;

export const ALLOWED_METADATA_KEYS = [
  'source',
  'reason_code',
  'related_ref',
  'channel',
] as const;

export type AdminNoteSeverity = 'info' | 'warning' | 'critical';
export type AdminNoteStatus = 'open' | 'resolved';
export type AdminNoteEntityType =
  | 'work_order'
  | 'contract'
  | 'quote'
  | 'lead'
  | 'booking'
  | 'task'
  | 'other';

export function isOfficialRef(ref: string | null | undefined): boolean {
  if (typeof ref !== 'string') return false;
  return OFFICIAL_REF.test(ref.trim().toUpperCase());
}

/** Throws when the supplied note text contains forbidden tokens/secrets. */
export function assertSafeNoteText(note: string): void {
  const trimmed = (note ?? '').trim();
  if (trimmed.length === 0) throw new Error('admin-note: empty');
  if (trimmed.length > 2000) throw new Error('admin-note: too-long');
  for (const re of FORBIDDEN_PATTERNS) {
    if (re.test(trimmed)) throw new Error('admin-note: forbidden-content');
  }
}

/** Whitelist-only sanitization for metadata blobs. */
export function sanitizeAdminNoteMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const k of ALLOWED_METADATA_KEYS) {
    const v = (metadata as Record<string, unknown>)[k];
    if (v == null) continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      // also strip forbidden patterns from string values
      if (typeof v === 'string') {
        for (const re of FORBIDDEN_PATTERNS) {
          if (re.test(v)) return {};
        }
        if (v.length > 200) continue;
      }
      out[k] = v;
    }
  }
  return out;
}