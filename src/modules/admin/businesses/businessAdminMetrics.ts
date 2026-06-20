/**
 * ADMIN BUSINESSES + PROVIDERS CONTROL CENTER — Phase 1.
 *
 * Pure metric helpers derived from the safe-column business rows
 * already loaded by `AdminBusinesses` (no extra Supabase reads, no
 * sensitive columns). Used by the new Overview tab so the KPIs and
 * visual bars stay 100% data-driven.
 */

export type BusinessMetricsRow = {
  id: string;
  ref_id?: string | null;
  name_ar?: string | null;
  name_en?: string | null;
  is_active?: boolean | null;
  is_verified?: boolean | null;
  is_demo?: boolean | null;
  approval_status?: string | null;
  username?: string | null;
  username_status?: string | null;
  phone?: string | null;
  email?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  entity_type?: string | null;
  region?: string | null;
  region_en?: string | null;
  city_id?: string | null;
  created_at?: string | null;
};

const lc = (s?: string | null) => (s || '').toLowerCase();

export const isPublished = (b: BusinessMetricsRow): boolean =>
  !!b.is_active && !b.is_demo;

export const isDraft = (b: BusinessMetricsRow): boolean => {
  const s = lc(b.approval_status);
  if (s === 'draft') return true;
  return !s && b.is_active === false && b.is_verified === false;
};

export const isInactive = (b: BusinessMetricsRow): boolean =>
  b.is_active === false && !isDraft(b);

export const isPendingReview = (b: BusinessMetricsRow): boolean => {
  const s = lc(b.approval_status);
  return s === 'pending' || s === 'in_review' || s === 'review';
};

export const isRejected = (b: BusinessMetricsRow): boolean => {
  const s = lc(b.approval_status);
  return s === 'rejected' || s === 'suspended';
};

export const isMissingContact = (b: BusinessMetricsRow): boolean =>
  !b.phone && !b.email;

export const isMissingPublicLink = (b: BusinessMetricsRow): boolean =>
  !b.username;

export const isMissingDescription = (b: BusinessMetricsRow): boolean =>
  !b.description_ar && !b.description_en;

export const isMissingMedia = (b: BusinessMetricsRow): boolean =>
  !b.logo_url && !b.cover_url;

/**
 * Pilot-readiness heuristic: active, non-demo, has public username
 * AND at least one contact channel, AND not pending review/rejected.
 */
export const isPilotReady = (b: BusinessMetricsRow): boolean =>
  !!b.is_active &&
  !b.is_demo &&
  !!b.username &&
  (!!b.phone || !!b.email) &&
  !isPendingReview(b) &&
  !isRejected(b);

export interface BusinessOverviewMetrics {
  total: number;
  published: number;
  drafts: number;
  inactive: number;
  pendingReview: number;
  rejected: number;
  missingContact: number;
  missingPublicLink: number;
  missingDescription: number;
  missingMedia: number;
  pilotReady: number;
  verified: number;
}

export function computeOverviewMetrics(
  rows: ReadonlyArray<BusinessMetricsRow>,
): BusinessOverviewMetrics {
  return {
    total: rows.length,
    published: rows.filter(isPublished).length,
    drafts: rows.filter(isDraft).length,
    inactive: rows.filter(isInactive).length,
    pendingReview: rows.filter(isPendingReview).length,
    rejected: rows.filter(isRejected).length,
    missingContact: rows.filter(isMissingContact).length,
    missingPublicLink: rows.filter(isMissingPublicLink).length,
    missingDescription: rows.filter(isMissingDescription).length,
    missingMedia: rows.filter(isMissingMedia).length,
    pilotReady: rows.filter(isPilotReady).length,
    verified: rows.filter((b) => !!b.is_verified).length,
  };
}

export interface DistributionBucket {
  key: string;
  label: string;
  count: number;
}

/**
 * Status distribution — drives the overview status visual bar.
 */
export function statusDistribution(
  rows: ReadonlyArray<BusinessMetricsRow>,
  isRTL: boolean,
): DistributionBucket[] {
  const buckets: DistributionBucket[] = [
    { key: 'published',     label: isRTL ? 'منشورة' : 'Published',     count: rows.filter(isPublished).length },
    { key: 'pendingReview', label: isRTL ? 'بانتظار المراجعة' : 'Pending review', count: rows.filter(isPendingReview).length },
    { key: 'drafts',        label: isRTL ? 'مسودة' : 'Draft',          count: rows.filter(isDraft).length },
    { key: 'inactive',      label: isRTL ? 'غير نشطة' : 'Inactive',    count: rows.filter(isInactive).length },
    { key: 'rejected',      label: isRTL ? 'مرفوضة/موقوفة' : 'Rejected/Suspended', count: rows.filter(isRejected).length },
  ];
  return buckets.filter((b) => b.count > 0);
}

/**
 * Entity-type distribution — used as the closest real-data proxy for
 * "sector" until a dedicated sector column exists. Empty when no rows
 * carry an `entity_type`.
 */
export function entityTypeDistribution(
  rows: ReadonlyArray<BusinessMetricsRow>,
  isRTL: boolean,
): DistributionBucket[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = (r.entity_type || '').trim();
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const labelFor = (k: string): string => {
    if (!isRTL) return k.replace(/_/g, ' ');
    const map: Record<string, string> = {
      company: 'شركة',
      establishment: 'مؤسسة',
      individual: 'فرد',
      government: 'جهة حكومية',
      nonprofit: 'غير ربحية',
    };
    return map[k] ?? k;
  };
  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: labelFor(key), count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Completeness distribution — counts rows missing each completeness
 * dimension. Use alongside the total to render visual bars.
 */
export function completenessDistribution(
  rows: ReadonlyArray<BusinessMetricsRow>,
  isRTL: boolean,
): DistributionBucket[] {
  return [
    { key: 'contact',     label: isRTL ? 'بدون تواصل' : 'Missing contact',     count: rows.filter(isMissingContact).length },
    { key: 'publicLink',  label: isRTL ? 'بدون رابط عام' : 'Missing public link', count: rows.filter(isMissingPublicLink).length },
    { key: 'description', label: isRTL ? 'بدون وصف' : 'Missing description',  count: rows.filter(isMissingDescription).length },
    { key: 'media',       label: isRTL ? 'بدون صور' : 'Missing media',        count: rows.filter(isMissingMedia).length },
  ];
}

/**
 * Verification distribution — verified vs. unverified split.
 */
export function verificationDistribution(
  rows: ReadonlyArray<BusinessMetricsRow>,
  isRTL: boolean,
): DistributionBucket[] {
  const verified = rows.filter((r) => !!r.is_verified).length;
  return [
    { key: 'verified',   label: isRTL ? 'موثّقة'      : 'Verified',   count: verified },
    { key: 'unverified', label: isRTL ? 'غير موثّقة' : 'Unverified', count: rows.length - verified },
  ].filter((b) => b.count > 0);
}

/**
 * Completeness-tier distribution — groups every row by its
 * completeness score into Excellent/Good/Fair/Poor tiers.
 */
export function completenessTierDistribution(
  rows: ReadonlyArray<BusinessMetricsRow>,
  isRTL: boolean,
): DistributionBucket[] {
  const tiers = { excellent: 0, good: 0, fair: 0, poor: 0 };
  for (const r of rows) {
    const pct = Math.round(completenessScore(r) * 100);
    if (pct >= 90) tiers.excellent += 1;
    else if (pct >= 70) tiers.good += 1;
    else if (pct >= 40) tiers.fair += 1;
    else tiers.poor += 1;
  }
  return [
    { key: 'excellent', label: isRTL ? 'ممتاز (≥90٪)' : 'Excellent (≥90%)', count: tiers.excellent },
    { key: 'good',      label: isRTL ? 'جيد (70-89٪)' : 'Good (70-89%)',    count: tiers.good },
    { key: 'fair',      label: isRTL ? 'مقبول (40-69٪)' : 'Fair (40-69%)',  count: tiers.fair },
    { key: 'poor',      label: isRTL ? 'ضعيف (<40٪)'  : 'Poor (<40%)',      count: tiers.poor },
  ].filter((b) => b.count > 0);
}

/**
 * Rebuild — Phase 2 helpers.
 *
 * Heuristic for "provider-like" rows: entity_type values that signal
 * a service provider in the current data model (`company`,
 * `establishment`). Individuals/government/nonprofit are excluded.
 * If `entity_type` is missing we conservatively include the row so
 * the Providers tab still surfaces it for completion.
 */
const PROVIDER_ENTITY_TYPES = new Set(['company', 'establishment']);

export const isProviderLike = (b: BusinessMetricsRow): boolean => {
  const t = (b.entity_type || '').trim().toLowerCase();
  if (!t) return true;
  return PROVIDER_ENTITY_TYPES.has(t);
};

export type ProviderSegment =
  | 'qualified'
  | 'noContact'
  | 'noPublicLink'
  | 'unpublished'
  | 'pendingOrRejected';

/**
 * Single-segment classifier for a provider row. Priority order is
 * deterministic so each provider appears in exactly one segment.
 */
export function providerSegment(b: BusinessMetricsRow): ProviderSegment {
  if (isPendingReview(b) || isRejected(b)) return 'pendingOrRejected';
  if (!b.is_active || b.is_demo) return 'unpublished';
  if (isMissingPublicLink(b)) return 'noPublicLink';
  if (isMissingContact(b)) return 'noContact';
  return 'qualified';
}

export function providerSegmentLabel(
  seg: ProviderSegment,
  isRTL: boolean,
): string {
  const ar: Record<ProviderSegment, string> = {
    qualified: 'مؤهلون',
    noContact: 'بدون تواصل',
    noPublicLink: 'بدون رابط عام',
    unpublished: 'غير منشورين',
    pendingOrRejected: 'بانتظار المراجعة / مرفوض',
  };
  const en: Record<ProviderSegment, string> = {
    qualified: 'Qualified',
    noContact: 'Missing contact',
    noPublicLink: 'Missing public link',
    unpublished: 'Unpublished',
    pendingOrRejected: 'Pending / rejected',
  };
  return isRTL ? ar[seg] : en[seg];
}

/**
 * Bilingual list of reasons why a row is NOT pilot-ready. Empty list
 * means the row passes every check (i.e. `isPilotReady` is true).
 */
export function pilotReadinessReasons(
  b: BusinessMetricsRow,
  isRTL: boolean,
): string[] {
  const out: string[] = [];
  if (!b.is_active) out.push(isRTL ? 'غير نشطة' : 'Inactive');
  if (b.is_demo) out.push(isRTL ? 'بيانات تجريبية' : 'Demo data');
  if (isMissingPublicLink(b)) out.push(isRTL ? 'بدون رابط عام' : 'Missing public link');
  if (isMissingContact(b)) out.push(isRTL ? 'بدون تواصل' : 'Missing contact');
  if (isPendingReview(b)) out.push(isRTL ? 'بانتظار المراجعة' : 'Pending review');
  if (isRejected(b)) out.push(isRTL ? 'مرفوضة/موقوفة' : 'Rejected/Suspended');
  return out;
}

/**
 * City/region distribution — uses the available `region` label.
 * Falls back to `region_en`, then `city_id`. Empty when no row has
 * any of these.
 */
export function cityDistribution(
  rows: ReadonlyArray<BusinessMetricsRow>,
  isRTL: boolean,
): DistributionBucket[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const r of rows) {
    const raw = (isRTL ? r.region : r.region_en) || r.region || r.region_en || r.city_id || '';
    const key = raw.trim();
    if (!key) continue;
    const bucket = counts.get(key);
    if (bucket) bucket.count += 1;
    else counts.set(key, { label: key, count: 1 });
  }
  return [...counts.entries()]
    .map(([key, v]) => ({ key, label: v.label, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

export type ReviewBucketKey =
  | 'drafts'
  | 'pending'
  | 'inactive'
  | 'demo'
  | 'noUsername'
  | 'noContact';

export interface ReviewBucket {
  key: ReviewBucketKey;
  label: string;
  rows: BusinessMetricsRow[];
}

/**
 * Review buckets — partition the rows into actionable review groups.
 * A row can appear in multiple buckets on purpose (e.g. a draft can
 * also be missing contact); the Review tab uses these counts to
 * drive the operations workflow.
 */
export function reviewBuckets(
  rows: ReadonlyArray<BusinessMetricsRow>,
  isRTL: boolean,
): ReviewBucket[] {
  const mk = (key: ReviewBucketKey, ar: string, en: string, pred: (b: BusinessMetricsRow) => boolean): ReviewBucket => ({
    key,
    label: isRTL ? ar : en,
    rows: rows.filter(pred),
  });
  return [
    mk('drafts',     'مسودات',                'Drafts',                isDraft),
    mk('pending',    'بانتظار المراجعة',      'Pending review',        isPendingReview),
    mk('inactive',   'غير نشطة',              'Inactive',              isInactive),
    mk('demo',       'بيانات تجريبية',        'Demo',                  (b) => !!b.is_demo),
    mk('noUsername', 'بدون اسم مستخدم',       'No username',           isMissingPublicLink),
    mk('noContact',  'بدون تواصل',            'No contact',            isMissingContact),
  ];
}

export interface TrendPoint {
  day: string;
  label: string;
  created: number;
  cumulative: number;
}

/**
 * Daily creation trend for the last `days` days, based on `created_at`.
 * Returns an empty array if no row has a parseable date.
 */
export function creationTrend(
  rows: ReadonlyArray<BusinessMetricsRow>,
  days = 30,
): TrendPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  let hasAny = false;
  for (const r of rows) {
    if (!r.created_at) continue;
    const k = new Date(r.created_at).toISOString().slice(0, 10);
    if (buckets.has(k)) {
      buckets.set(k, (buckets.get(k) ?? 0) + 1);
      hasAny = true;
    }
  }
  if (!hasAny) return [];
  let cum = 0;
  return [...buckets.entries()].map(([day, created]) => {
    cum += created;
    return { day, label: day.slice(5), created, cumulative: cum };
  });
}

/**
 * Build a CSV export of the safe-column business rows. No PII beyond
 * what is already loaded in the admin UI. RFC-4180 escaping.
 */
export function buildBusinessesCsv(
  rows: ReadonlyArray<BusinessMetricsRow>,
): string {
  const headers = [
    'ref_id', 'name_ar', 'name_en', 'entity_type', 'region',
    'is_active', 'is_verified', 'is_demo', 'approval_status',
    'username', 'phone', 'email', 'created_at',
  ] as const;
  const esc = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => esc((r as Record<string, unknown>)[h])).join(','));
  }
  return lines.join('\n');
}

/**
 * Per-row completeness score (0..1): contact, public link, description,
 * media. Used to power the average-completeness KPI.
 */
export function completenessScore(b: BusinessMetricsRow): number {
  let s = 0;
  if (!isMissingContact(b)) s += 0.25;
  if (!isMissingPublicLink(b)) s += 0.25;
  if (!isMissingDescription(b)) s += 0.25;
  if (!isMissingMedia(b)) s += 0.25;
  return s;
}

export interface AdvancedMetrics {
  verificationRate: number;       // 0..100
  publishRate: number;            // 0..100
  pilotReadyRate: number;         // 0..100
  avgCompleteness: number;        // 0..100
  demoRatio: number;              // 0..100
  weeklyCreated: number;          // last 7d count
  prevWeeklyCreated: number;      // previous 7d count
  weeklyDelta: number;            // signed delta
  weeklyDeltaPct: number;         // signed %, 0 if prev=0
  reviewBacklog: number;          // pending review count
}

export function computeAdvancedMetrics(
  rows: ReadonlyArray<BusinessMetricsRow>,
): AdvancedMetrics {
  const total = rows.length;
  const safePct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  let weekly = 0;
  let prevWeekly = 0;
  for (const r of rows) {
    if (!r.created_at) continue;
    const t = new Date(r.created_at).getTime();
    if (Number.isNaN(t)) continue;
    const ageDays = (now - t) / DAY;
    if (ageDays < 7) weekly += 1;
    else if (ageDays < 14) prevWeekly += 1;
  }
  const delta = weekly - prevWeekly;
  const avg = total
    ? Math.round((rows.reduce((s, r) => s + completenessScore(r), 0) / total) * 100)
    : 0;

  return {
    verificationRate: safePct(rows.filter((r) => !!r.is_verified).length, total),
    publishRate: safePct(rows.filter(isPublished).length, total),
    pilotReadyRate: safePct(rows.filter(isPilotReady).length, total),
    avgCompleteness: avg,
    demoRatio: safePct(rows.filter((r) => !!r.is_demo).length, total),
    weeklyCreated: weekly,
    prevWeeklyCreated: prevWeekly,
    weeklyDelta: delta,
    weeklyDeltaPct: prevWeekly ? Math.round((delta / prevWeekly) * 100) : 0,
    reviewBacklog: rows.filter(isPendingReview).length,
  };
}

/**
 * Weekly creation series for sparklines.
 * Returns counts per week, oldest -> newest. Default 8 weeks.
 */
export function weeklyCreationSeries(
  rows: ReadonlyArray<BusinessMetricsRow>,
  weeks = 8,
): number[] {
  const now = Date.now();
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const buckets = new Array(weeks).fill(0) as number[];
  for (const r of rows) {
    if (!r.created_at) continue;
    const t = new Date(r.created_at).getTime();
    if (Number.isNaN(t)) continue;
    const idx = Math.floor((now - t) / WEEK);
    if (idx >= 0 && idx < weeks) buckets[weeks - 1 - idx] += 1;
  }
  return buckets;
}

export interface HealthScore {
  /** 0..100 weighted composite. */
  score: number;
  /** Per-dimension contributions (0..100). */
  dimensions: ReadonlyArray<{
    key: 'publish' | 'verify' | 'completeness' | 'contact' | 'pilot';
    score: number;
    weight: number; // 0..1
  }>;
  /** Human grade for quick reading. */
  grade: 'A' | 'B' | 'C' | 'D';
}

/**
 * Directory-wide health score: weighted blend of publish-rate,
 * verification, completeness, contact-coverage and pilot-readiness.
 * Stable, pure, and derived from already-loaded rows.
 */
export function computeHealthScore(
  rows: ReadonlyArray<BusinessMetricsRow>,
): HealthScore {
  const a = computeAdvancedMetrics(rows);
  const total = rows.length;
  const contactCoverage = total
    ? Math.round(((total - rows.filter(isMissingContact).length) / total) * 100)
    : 0;

  const dims = [
    { key: 'publish' as const,      score: a.publishRate,       weight: 0.20 },
    { key: 'verify' as const,       score: a.verificationRate,  weight: 0.25 },
    { key: 'completeness' as const, score: a.avgCompleteness,   weight: 0.25 },
    { key: 'contact' as const,      score: contactCoverage,     weight: 0.15 },
    { key: 'pilot' as const,        score: a.pilotReadyRate,    weight: 0.15 },
  ];

  const score = Math.round(dims.reduce((s, d) => s + d.score * d.weight, 0));
  const grade: HealthScore['grade'] =
    score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D';

  return { score, grade, dimensions: dims };
}
