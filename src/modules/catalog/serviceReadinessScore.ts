/**
 * PSG-1 — Part D: Service readiness score.
 * Pure function. Operates on a normalized service shape compatible
 * with `business_services` rows.
 *
 * Weights (total 100):
 *   Name             15
 *   Description      15
 *   Category         15
 *   Service area     10
 *   Images           10
 *   SEO              15
 *   Verification     10
 *   Pricing visibility 10
 */

export interface ServiceReadinessInput {
  name_ar?: string | null;
  name_en?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  category_id?: string | null;
  service_area_count?: number | null;
  images_count?: number | null;
  seo_title?: string | null;
  seo_description?: string | null;
  slug?: string | null;
  admin_status?: string | null;
  provider_status?: string | null;
  is_active?: boolean | null;
  price_from?: number | null;
  price_to?: number | null;
}

export type ServiceReadinessBand = 'poor' | 'needs_work' | 'good' | 'ready';

export interface ServiceReadinessComponent {
  key:
    | 'name'
    | 'description'
    | 'category'
    | 'service_area'
    | 'images'
    | 'seo'
    | 'verification'
    | 'pricing';
  weight: number;
  earned: number;
  ratio: number;
  ar: string;
  en: string;
  missing: string[];
}

export interface ServiceReadinessResult {
  score: number;
  band: ServiceReadinessBand;
  components: ServiceReadinessComponent[];
  missingRequirements: string[];
  nextRecommendedAction: { key: string; ar: string; en: string } | null;
}

const len = (v?: string | null) => (typeof v === 'string' ? v.trim().length : 0);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function computeServiceReadinessScore(
  input: ServiceReadinessInput,
): ServiceReadinessResult {
  const components: ServiceReadinessComponent[] = [];
  const push = (
    key: ServiceReadinessComponent['key'],
    weight: number,
    ratio: number,
    ar: string,
    en: string,
    missing: string[],
  ) => {
    const r = clamp01(ratio);
    components.push({ key, weight, ratio: r, earned: Math.round(weight * r), ar, en, missing });
  };

  const nameAr = len(input.name_ar);
  const nameEn = len(input.name_en);
  push('name', 15,
    (nameAr >= 3 ? 0.6 : 0) + (nameEn >= 3 ? 0.4 : 0),
    'اسم الخدمة', 'Service name',
    [nameAr < 3 && 'name_ar', nameEn < 3 && 'name_en'].filter(Boolean) as string[]);

  const descAr = len(input.description_ar);
  const descEn = len(input.description_en);
  push('description', 15,
    (descAr >= 40 ? 0.6 : descAr >= 10 ? 0.3 : 0) +
    (descEn >= 40 ? 0.4 : descEn >= 10 ? 0.2 : 0),
    'الوصف', 'Description',
    [descAr < 40 && 'description_ar', descEn < 40 && 'description_en'].filter(Boolean) as string[]);

  push('category', 15, input.category_id ? 1 : 0,
    'التصنيف', 'Category', input.category_id ? [] : ['category_id']);

  const areas = Math.max(0, Number(input.service_area_count ?? 0));
  push('service_area', 10,
    areas >= 3 ? 1 : areas >= 1 ? 0.5 : 0,
    'مناطق الخدمة', 'Service area',
    areas < 1 ? ['service_area'] : []);

  const imgs = Math.max(0, Number(input.images_count ?? 0));
  push('images', 10,
    imgs >= 3 ? 1 : imgs >= 1 ? 0.5 : 0,
    'الصور', 'Images',
    imgs < 1 ? ['images'] : []);

  const seoTitle = len(input.seo_title) >= 10;
  const seoDesc = len(input.seo_description) >= 40;
  const slug = len(input.slug) >= 3;
  push('seo', 15,
    (seoTitle ? 0.4 : 0) + (seoDesc ? 0.4 : 0) + (slug ? 0.2 : 0),
    'تهيئة محركات البحث', 'SEO',
    [!seoTitle && 'seo_title', !seoDesc && 'seo_description', !slug && 'slug']
      .filter(Boolean) as string[]);

  const verified =
    input.admin_status === 'allowed' &&
    (input.provider_status ?? 'active') === 'active' &&
    input.is_active !== false;
  push('verification', 10, verified ? 1 : 0,
    'التحقق والاعتماد', 'Verification & approval',
    verified ? [] : ['verification']);

  const pricing = Number(input.price_from ?? 0) > 0 || Number(input.price_to ?? 0) > 0;
  push('pricing', 10, pricing ? 1 : 0,
    'وضوح التسعير', 'Pricing visibility',
    pricing ? [] : ['pricing']);

  const score = components.reduce((s, c) => s + c.earned, 0);
  const band: ServiceReadinessBand =
    score >= 85 ? 'ready' : score >= 65 ? 'good' : score >= 40 ? 'needs_work' : 'poor';
  const missingRequirements = components.flatMap((c) => c.missing);
  const weakest = [...components].sort((a, b) => a.ratio - b.ratio)[0] ?? null;
  const nextRecommendedAction = weakest && weakest.ratio < 1
    ? { key: weakest.key, ar: `حسّن: ${weakest.ar}`, en: `Improve: ${weakest.en}` }
    : null;

  return { score, band, components, missingRequirements, nextRecommendedAction };
}