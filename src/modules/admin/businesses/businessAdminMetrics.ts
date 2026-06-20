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
