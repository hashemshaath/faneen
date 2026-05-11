/**
 * Phase M3C.1 — Centralized mapping for server-side membership limit errors.
 * Triggers raise messages of the form: `LIMIT_EXCEEDED:<metric>`
 * Frontend translates them to localized, user-friendly toasts.
 */

export type LimitMetric = 'branches';

const COPY: Record<LimitMetric, { ar: string; en: string }> = {
  branches: {
    ar: 'تجاوزت الحد المتاح للفروع في باقتك الحالية. يرجى ترقية الباقة أو إلغاء تنشيط فرع آخر.',
    en: 'You have reached the branch limit for your current plan. Upgrade or deactivate another branch first.',
  },
};

export interface ParsedLimitError {
  metric: LimitMetric;
  message: string;
}

/**
 * Parse a Supabase/Postgres error and, if it matches `LIMIT_EXCEEDED:<metric>`,
 * return a localized message. Returns null for unrelated errors so callers can
 * fall through to existing handling.
 */
export function parseMembershipLimitError(
  err: unknown,
  isRTL: boolean,
): ParsedLimitError | null {
  if (!err) return null;
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : (err as { message?: string })?.message ?? '';
  if (!raw || typeof raw !== 'string') return null;

  const match = raw.match(/LIMIT_EXCEEDED:([a-z_]+)/i);
  if (!match) return null;
  const metric = match[1].toLowerCase() as LimitMetric;
  const copy = COPY[metric];
  if (!copy) return null;

  return { metric, message: isRTL ? copy.ar : copy.en };
}