/**
 * PROVIDER-GROWTH-ENGINE-1 — Part C
 *
 * Pure helper. Measures the *data quality* of a provider record
 * (vs. readiness, which measures completeness for publishing).
 *
 * Returns 0..100. Higher = cleaner data.
 *
 * Components (each contributes a penalty subtracted from 100):
 *   - duplicate risk      max 25
 *   - missing data        max 25
 *   - invalid data        max 25
 *   - outdated data       max 15
 *   - enrichment confidence (inverse) max 10
 */

export interface QualityInput {
  name_ar?: string | null;
  name_en?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logo_url?: string | null;
  city?: string | null;
  city_id?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  sectors?: string[] | null;
  sub_services?: string[] | null;
  updated_at?: string | null;
  last_enriched_at?: string | null;
  enrichment_confidence?: number | null; // 0..1 from data enrichment engine
  duplicate_candidates?: number | null; // count of suspected duplicates
  duplicate_score?: number | null; // 0..1 from dedupe engine
}

export type QualityBand = 'poor' | 'fair' | 'good' | 'excellent';

export interface QualityIssue {
  category: 'duplicate' | 'missing' | 'invalid' | 'outdated' | 'enrichment';
  key: string;
  ar: string;
  en: string;
  penalty: number;
}

export interface QualityResult {
  score: number;
  band: QualityBand;
  issues: QualityIssue[];
  penalties: Record<QualityIssue['category'], number>;
}

const PHONE_RE = /^\+?[0-9\s\-()]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/[^\s]+$/i;
const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, (now - t) / DAY_MS);
}

export function computeProviderQualityScore(
  b: QualityInput,
  opts: { now?: number } = {},
): QualityResult {
  const now = opts.now ?? Date.now();
  const issues: QualityIssue[] = [];
  const penalties: QualityResult['penalties'] = {
    duplicate: 0,
    missing: 0,
    invalid: 0,
    outdated: 0,
    enrichment: 0,
  };

  const add = (i: QualityIssue) => {
    issues.push(i);
    penalties[i.category] += i.penalty;
  };

  // 1. Duplicate risk (max 25)
  const dupScore = b.duplicate_score ?? 0;
  const dupCount = b.duplicate_candidates ?? 0;
  if (dupScore > 0 || dupCount > 0) {
    const p = Math.min(25, Math.round(dupScore * 25 + Math.min(dupCount, 5) * 3));
    if (p > 0) {
      add({
        category: 'duplicate',
        key: 'duplicate_candidates',
        ar: 'احتمال تكرار مع منشآت أخرى',
        en: 'Possible duplicates detected',
        penalty: p,
      });
    }
  }

  // 2. Missing data (max 25)
  const missingChecks: Array<[string, boolean, string, string, number]> = [
    ['name', !(b.name_ar || b.name_en), 'الاسم مفقود', 'Missing name', 6],
    ['phone', !b.phone, 'رقم الهاتف مفقود', 'Missing phone', 5],
    ['email', !b.email, 'البريد الإلكتروني مفقود', 'Missing email', 3],
    ['website', !b.website, 'الموقع الإلكتروني مفقود', 'Missing website', 2],
    ['logo', !b.logo_url, 'الشعار مفقود', 'Missing logo', 3],
    ['city', !(b.city || b.city_id), 'المدينة مفقودة', 'Missing city', 3],
    ['address', !b.address, 'العنوان مفقود', 'Missing address', 2],
    ['sectors', (b.sectors?.length ?? 0) === 0, 'القطاعات مفقودة', 'Missing sectors', 1],
  ];
  for (const [key, isMissing, ar, en, penalty] of missingChecks) {
    if (isMissing) add({ category: 'missing', key, ar, en, penalty });
  }

  // 3. Invalid data (max 25)
  if (b.phone && !PHONE_RE.test(b.phone.trim())) {
    add({ category: 'invalid', key: 'phone_format', ar: 'صيغة رقم الهاتف غير صحيحة', en: 'Invalid phone format', penalty: 8 });
  }
  if (b.email && !EMAIL_RE.test(b.email.trim())) {
    add({ category: 'invalid', key: 'email_format', ar: 'صيغة البريد غير صحيحة', en: 'Invalid email format', penalty: 8 });
  }
  if (b.website && !URL_RE.test(b.website.trim())) {
    add({ category: 'invalid', key: 'website_format', ar: 'صيغة الموقع غير صحيحة', en: 'Invalid website URL', penalty: 5 });
  }
  if (
    (typeof b.latitude === 'number' &&
      (b.latitude < -90 || b.latitude > 90 || b.latitude === 0)) ||
    (typeof b.longitude === 'number' &&
      (b.longitude < -180 || b.longitude > 180 || b.longitude === 0))
  ) {
    add({ category: 'invalid', key: 'coordinates', ar: 'إحداثيات غير صحيحة', en: 'Invalid coordinates', penalty: 4 });
  }

  // 4. Outdated data (max 15)
  const updatedDays = daysSince(b.updated_at, now);
  if (updatedDays !== null && updatedDays > 365) {
    add({
      category: 'outdated',
      key: 'updated_at_stale',
      ar: 'لم يتم تحديث الملف منذ أكثر من سنة',
      en: 'Profile not updated in over a year',
      penalty: 10,
    });
  } else if (updatedDays !== null && updatedDays > 180) {
    add({
      category: 'outdated',
      key: 'updated_at_aging',
      ar: 'لم يتم تحديث الملف منذ 6 أشهر',
      en: 'Profile stale for 6+ months',
      penalty: 5,
    });
  }
  const enrichedDays = daysSince(b.last_enriched_at, now);
  if (b.last_enriched_at !== undefined && enrichedDays !== null && enrichedDays > 180) {
    add({
      category: 'outdated',
      key: 'enrichment_stale',
      ar: 'البيانات تحتاج إثراء جديد',
      en: 'Enrichment data is stale',
      penalty: 5,
    });
  }

  // 5. Enrichment confidence (max 10) — only counts if we have a signal.
  if (typeof b.enrichment_confidence === 'number') {
    const conf = Math.max(0, Math.min(1, b.enrichment_confidence));
    const p = Math.round((1 - conf) * 10);
    if (p > 0) {
      add({
        category: 'enrichment',
        key: 'low_confidence',
        ar: 'ثقة منخفضة في بيانات الإثراء',
        en: 'Low enrichment confidence',
        penalty: p,
      });
    }
  }

  // Cap each category and clamp final score.
  const caps: QualityResult['penalties'] = {
    duplicate: 25,
    missing: 25,
    invalid: 25,
    outdated: 15,
    enrichment: 10,
  };
  let total = 0;
  (Object.keys(caps) as Array<keyof typeof caps>).forEach((k) => {
    penalties[k] = Math.min(penalties[k], caps[k]);
    total += penalties[k];
  });

  const score = Math.max(0, Math.min(100, 100 - total));
  const band: QualityBand =
    score >= 85 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor';

  return { score, band, issues, penalties };
}

export const PROVIDER_QUALITY_BANDS: ReadonlyArray<QualityBand> = [
  'poor',
  'fair',
  'good',
  'excellent',
];