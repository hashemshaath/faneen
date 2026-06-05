/**
 * PSG-1 — Part F: Service quality score (0–100).
 * Pure function. No Supabase.
 *
 * Dimensions:
 *   duplicate_risk    25
 *   missing_fields    20
 *   category_quality  15
 *   seo_quality       20
 *   enrichment        20
 */

export interface ServiceQualityInput {
  name_ar?: string | null;
  name_en?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  duplicate_name_count?: number | null;
  category_id?: string | null;
  category_depth?: number | null;
  category_active?: boolean | null;
  service_area_count?: number | null;
  images_count?: number | null;
  seo_title?: string | null;
  seo_description?: string | null;
  slug?: string | null;
}

export type ServiceQualityBand = 'poor' | 'fair' | 'good' | 'excellent';

export interface ServiceQualityComponent {
  key: 'duplicate_risk' | 'missing_fields' | 'category_quality' | 'seo_quality' | 'enrichment';
  weight: number;
  earned: number;
  ratio: number;
  ar: string;
  en: string;
}

export interface ServiceQualityResult {
  score: number;
  band: ServiceQualityBand;
  components: ServiceQualityComponent[];
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const len = (v?: string | null) => (typeof v === 'string' ? v.trim().length : 0);

export function computeServiceQualityScore(input: ServiceQualityInput): ServiceQualityResult {
  const components: ServiceQualityComponent[] = [];
  const push = (
    key: ServiceQualityComponent['key'],
    weight: number,
    ratio: number,
    ar: string,
    en: string,
  ) => {
    const r = clamp01(ratio);
    components.push({ key, weight, ratio: r, earned: Math.round(weight * r), ar, en });
  };

  const dup = Math.max(0, Number(input.duplicate_name_count ?? 0));
  push('duplicate_risk', 25,
    dup === 0 ? 1 : dup === 1 ? 0.5 : 0,
    'مخاطر التكرار', 'Duplicate risk');

  const missingCount =
    (len(input.name_ar) >= 3 ? 0 : 1) +
    (len(input.description_ar) >= 10 ? 0 : 1) +
    (input.category_id ? 0 : 1) +
    ((Number(input.service_area_count ?? 0) >= 1) ? 0 : 1) +
    ((Number(input.images_count ?? 0) >= 1) ? 0 : 1);
  push('missing_fields', 20, 1 - Math.min(1, missingCount / 5),
    'الحقول الناقصة', 'Missing fields');

  const catRatio = input.category_id
    ? (input.category_active === false ? 0.3 : Math.min(1, 0.5 + 0.25 * Math.max(0, Number(input.category_depth ?? 1))))
    : 0;
  push('category_quality', 15, catRatio, 'جودة التصنيف', 'Category quality');

  const seoOk =
    (len(input.seo_title) >= 10 ? 0.4 : 0) +
    (len(input.seo_description) >= 40 ? 0.4 : 0) +
    (len(input.slug) >= 3 ? 0.2 : 0);
  push('seo_quality', 20, seoOk, 'جودة SEO', 'SEO quality');

  const enrichment =
    (len(input.name_en) >= 3 ? 0.3 : 0) +
    (len(input.description_en) >= 40 ? 0.3 : 0) +
    (Number(input.images_count ?? 0) >= 2 ? 0.2 : 0) +
    (Number(input.service_area_count ?? 0) >= 2 ? 0.2 : 0);
  push('enrichment', 20, enrichment, 'جودة الإثراء', 'Enrichment quality');

  const score = components.reduce((s, c) => s + c.earned, 0);
  const band: ServiceQualityBand =
    score >= 85 ? 'excellent' : score >= 65 ? 'good' : score >= 40 ? 'fair' : 'poor';
  return { score, band, components };
}