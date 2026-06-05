/**
 * PSG-1 — Part E: Product quality score (0–100).
 * Pure function. No Supabase.
 *
 * Dimensions:
 *   duplicate_risk   25
 *   missing_fields   20
 *   invalid_fields   15
 *   seo_quality      20
 *   enrichment       20
 */

export interface ProductQualityInput {
  name_ar?: string | null;
  name_en?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  duplicate_name_count?: number | null; // matches across the catalog
  category_id?: string | null;
  brand_id?: string | null;
  brand_status?: string | null;
  images_count?: number | null;
  specifications_count?: number | null;
  seo_title?: string | null;
  seo_description?: string | null;
  slug?: string | null;
  has_translations?: boolean | null;
}

export type ProductQualityBand = 'poor' | 'fair' | 'good' | 'excellent';

export interface ProductQualityComponent {
  key: 'duplicate_risk' | 'missing_fields' | 'invalid_fields' | 'seo_quality' | 'enrichment';
  weight: number;
  earned: number;
  ratio: number;
  ar: string;
  en: string;
}

export interface ProductQualityResult {
  score: number;
  band: ProductQualityBand;
  components: ProductQualityComponent[];
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const len = (v?: string | null) => (typeof v === 'string' ? v.trim().length : 0);

export function computeProductQualityScore(input: ProductQualityInput): ProductQualityResult {
  const components: ProductQualityComponent[] = [];
  const push = (
    key: ProductQualityComponent['key'],
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
    (input.brand_id ? 0 : 1) +
    ((Number(input.images_count ?? 0) >= 1) ? 0 : 1);
  push('missing_fields', 20, 1 - Math.min(1, missingCount / 5),
    'الحقول الناقصة', 'Missing fields');

  const brandValid = !input.brand_id || (input.brand_status ?? 'approved') === 'approved';
  const invalidCount = (brandValid ? 0 : 1);
  push('invalid_fields', 15, 1 - Math.min(1, invalidCount / 2),
    'الحقول غير الصالحة', 'Invalid fields');

  const seoOk =
    (len(input.seo_title) >= 10 ? 0.4 : 0) +
    (len(input.seo_description) >= 40 ? 0.4 : 0) +
    (len(input.slug) >= 3 ? 0.2 : 0);
  push('seo_quality', 20, seoOk, 'جودة SEO', 'SEO quality');

  const enrichment =
    (Number(input.images_count ?? 0) >= 2 ? 0.4 : 0) +
    (Number(input.specifications_count ?? 0) >= 2 ? 0.3 : 0) +
    (input.has_translations ? 0.3 : len(input.name_en) >= 3 ? 0.15 : 0);
  push('enrichment', 20, enrichment, 'جودة الإثراء', 'Enrichment quality');

  const score = components.reduce((s, c) => s + c.earned, 0);
  const band: ProductQualityBand =
    score >= 85 ? 'excellent' : score >= 65 ? 'good' : score >= 40 ? 'fair' : 'poor';
  return { score, band, components };
}