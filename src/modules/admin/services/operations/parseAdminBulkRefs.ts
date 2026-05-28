import { ADMIN_REF_OFFICIAL, isOfficialAdminRef } from './getAdminReferenceSummary';

/**
 * BUSINESS-ADMIN-5 — Bulk reference parser.
 *
 * Accepts free-form pasted text and produces a sanitized batch of official
 * refs ready for admin triage. Pure, read-only utility — no I/O.
 *
 * Rules:
 * - Splits on newlines, commas, semicolons, tabs, and spaces.
 * - Trims + uppercases each token.
 * - Dedupes while preserving first-seen order.
 * - Rejects UUIDs and malformed tokens (anything that fails
 *   `ADMIN_REF_OFFICIAL`).
 * - Caps accepted refs at MAX (default 100); excess tokens are dropped.
 */

export const ADMIN_BULK_REF_MAX = 100;

const UUID_SHAPE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export interface ParseAdminBulkRefsResult {
  /** Unique, valid, uppercase official refs, capped at MAX. */
  valid: string[];
  /** Tokens that were rejected (uppercased, trimmed). UUIDs included here. */
  invalid: string[];
  /** Count of duplicates removed from input. */
  duplicates: number;
  /** Count of valid refs dropped because the cap was hit. */
  truncated: number;
  /** True when input contained more raw tokens than MAX. */
  hitMax: boolean;
}

export function parseAdminBulkRefs(
  input: string,
  options: { max?: number } = {},
): ParseAdminBulkRefsResult {
  const max = Math.max(1, Math.min(options.max ?? ADMIN_BULK_REF_MAX, ADMIN_BULK_REF_MAX));
  const raw = (input ?? '').split(/[\s,;]+/g);

  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  let truncated = 0;

  for (const tokRaw of raw) {
    const t = tokRaw.trim().toUpperCase();
    if (t.length === 0) continue;
    if (UUID_SHAPE.test(t) || !ADMIN_REF_OFFICIAL.test(t) || !isOfficialAdminRef(t)) {
      if (!invalid.includes(t)) invalid.push(t);
      continue;
    }
    if (seen.has(t)) {
      duplicates += 1;
      continue;
    }
    seen.add(t);
    if (valid.length >= max) {
      truncated += 1;
      continue;
    }
    valid.push(t);
  }

  return {
    valid,
    invalid,
    duplicates,
    truncated,
    hitMax: truncated > 0,
  };
}