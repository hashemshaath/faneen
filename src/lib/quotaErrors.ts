/**
 * M2 — Shared helpers for detecting and formatting membership quota errors.
 *
 * Server triggers raise:
 *   RAISE EXCEPTION 'quota_exceeded:<metric>' USING ERRCODE = '42501';
 *
 * PostgREST surfaces this as an error whose `message` (and sometimes `details`
 * or nested `error`) contains the `quota_exceeded:<metric>` substring.
 */

export const QUOTA_ERROR_PREFIX = 'quota_exceeded:';

export type QuotaMetric =
  | 'services'
  | 'contracts'
  | 'promotions'
  | 'portfolio'
  | 'staff'
  | 'branches'
  | 'blog_posts'
  | (string & {});

const collectStrings = (val: unknown, out: string[]): void => {
  if (val == null) return;
  if (typeof val === 'string') {
    out.push(val);
    return;
  }
  if (val instanceof Error) {
    if (val.message) out.push(val.message);
    // Some server clients pack extra info onto the Error instance
    // as enumerable own properties (details, hint, code, etc.).
    for (const v of Object.values(val as unknown as Record<string, unknown>)) {
      collectStrings(v, out);
    }
    return;
  }
  if (typeof val === 'object') {
    for (const v of Object.values(val as Record<string, unknown>)) {
      collectStrings(v, out);
    }
  }
};

const findQuotaText = (err: unknown): string | null => {
  const buf: string[] = [];
  collectStrings(err, buf);
  for (const s of buf) {
    const idx = s.indexOf(QUOTA_ERROR_PREFIX);
    if (idx >= 0) return s.slice(idx);
  }
  return null;
};

/** True when `error` looks like a `quota_exceeded:<metric>` server error. */
export function isQuotaExceededError(error: unknown): boolean {
  return findQuotaText(error) !== null;
}

/** Extract the `<metric>` portion, or `null` when not a quota error. */
export function getQuotaExceededMetric(error: unknown): QuotaMetric | null {
  const text = findQuotaText(error);
  if (!text) return null;
  const rest = text.slice(QUOTA_ERROR_PREFIX.length);
  // stop at first whitespace / punctuation so we don't pick up trailing prose
  const match = rest.match(/^[a-z_]+/i);
  return match ? (match[0] as QuotaMetric) : null;
}

/**
 * Localized human-readable label for a quota metric. Falls back to the raw
 * metric string when unknown so unrecognized future metrics still render.
 */
export function getQuotaMetricLabel(metric: QuotaMetric | null | undefined, isRTL: boolean): string {
  const map: Record<string, [string, string]> = {
    services: ['الخدمات', 'Services'],
    contracts: ['العقود', 'Contracts'],
    promotions: ['العروض', 'Promotions'],
    portfolio: ['أعمال المعرض', 'Portfolio items'],
    staff: ['أعضاء الفريق', 'Team members'],
    branches: ['الفروع', 'Branches'],
    blog_posts: ['مقالات المدونة', 'Blog posts'],
  };
  const key = String(metric ?? '');
  const pair = map[key];
  if (!pair) return key;
  return isRTL ? pair[0] : pair[1];
}

/**
 * Compose the friendly quota-exceeded message shown in toasts / inline alerts.
 * Kept in one place so all callsites match verbatim.
 */
export function formatQuotaExceededMessage(
  metric: QuotaMetric | null | undefined,
  isRTL: boolean,
): string {
  const label = getQuotaMetricLabel(metric, isRTL);
  return isRTL
    ? `وصلت للحد الأقصى المسموح في باقتك الحالية (${label}) — قم بترقية العضوية للمتابعة`
    : `You've reached your current plan limit (${label}) — upgrade your membership to continue`;
}

/** Description line paired with the quota toast/inline banner. */
export function getQuotaUpgradeHint(isRTL: boolean): string {
  return isRTL
    ? 'انتقل إلى صفحة العضوية لترقية باقتك.'
    : 'Open your membership page to upgrade your plan.';
}