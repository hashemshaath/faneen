/**
 * PSG-1 — Part C: Product readiness score.
 * Pure function. No Supabase imports. Drop-in once a products table lands.
 *
 * Weights (total 100):
 *   Name quality      15
 *   Description       15
 *   Images            15
 *   Category          10
 *   Brand             10
 *   Specifications    10
 *   SEO readiness     15
 *   Verification      10
 */

export interface ProductReadinessInput {
  name_ar?: string | null;
  name_en?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  images_count?: number | null;
  category_id?: string | null;
  brand_id?: string | null;
  brand_status?: string | null;
  specifications_count?: number | null;
  seo_title?: string | null;
  seo_description?: string | null;
  slug?: string | null;
  is_verified?: boolean | null;
  approval_status?: string | null;
}

export type ProductReadinessBand = 'poor' | 'needs_work' | 'good' | 'ready';

export interface ProductReadinessComponent {
  key:
    | 'name'
    | 'description'
    | 'images'
    | 'category'
    | 'brand'
    | 'specifications'
    | 'seo'
    | 'verification';
  weight: number;
  earned: number;
  ratio: number;
  ar: string;
  en: string;
  missing: string[];
}

export interface ProductReadinessResult {
  score: number;
  band: ProductReadinessBand;
  components: ProductReadinessComponent[];
  missingRequirements: string[];
  nextRecommendedAction: { key: string; ar: string; en: string } | null;
}

const len = (v?: string | null) => (typeof v === 'string' ? v.trim().length : 0);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function computeProductReadinessScore(
  input: ProductReadinessInput,
): ProductReadinessResult {
  const components: ProductReadinessComponent[] = [];
  const push = (
    key: ProductReadinessComponent['key'],
    weight: number,
    ratio: number,
    ar: string,
    en: string,
    missing: string[],
  ) => {
    const r = clamp01(ratio);
    components.push({
      key, weight, ratio: r, earned: Math.round(weight * r),
      ar, en, missing,
    });
  };

  // Name (15)
  const nameAr = len(input.name_ar);
  const nameEn = len(input.name_en);
  push('name', 15,
    (nameAr >= 3 ? 0.6 : 0) + (nameEn >= 3 ? 0.4 : 0),
    'اسم المنتج', 'Product name',
    [nameAr < 3 ? 'name_ar' : '', nameEn < 3 ? 'name_en' : ''].filter(Boolean));

  // Description (15)
  const descAr = len(input.description_ar);
  const descEn = len(input.description_en);
  push('description', 15,
    (descAr >= 40 ? 0.6 : descAr >= 10 ? 0.3 : 0) +
    (descEn >= 40 ? 0.4 : descEn >= 10 ? 0.2 : 0),
    'الوصف', 'Description',
    [descAr < 40 ? 'description_ar' : '', descEn < 40 ? 'description_en' : ''].filter(Boolean));

  // Images (15)
  const imgs = Math.max(0, Number(input.images_count ?? 0));
  push('images', 15,
    imgs >= 4 ? 1 : imgs >= 2 ? 0.6 : imgs >= 1 ? 0.3 : 0,
    'الصور', 'Images',
    imgs < 2 ? ['images'] : []);

  // Category (10)
  push('category', 10, input.category_id ? 1 : 0,
    'التصنيف', 'Category', input.category_id ? [] : ['category_id']);

  // Brand (10) — must be an approved brand
  const brandOk = Boolean(input.brand_id) &&
    (input.brand_status == null || input.brand_status === 'approved');
  push('brand', 10, brandOk ? 1 : input.brand_id ? 0.4 : 0,
    'العلامة التجارية', 'Brand',
    brandOk ? [] : ['brand_id']);

  // Specifications (10)
  const specs = Math.max(0, Number(input.specifications_count ?? 0));
  push('specifications', 10,
    specs >= 5 ? 1 : specs >= 2 ? 0.5 : 0,
    'المواصفات', 'Specifications',
    specs < 2 ? ['specifications'] : []);

  // SEO (15)
  const seoTitle = len(input.seo_title) >= 10;
  const seoDesc = len(input.seo_description) >= 40;
  const slug = len(input.slug) >= 3;
  push('seo', 15,
    (seoTitle ? 0.4 : 0) + (seoDesc ? 0.4 : 0) + (slug ? 0.2 : 0),
    'تهيئة محركات البحث', 'SEO',
    [!seoTitle && 'seo_title', !seoDesc && 'seo_description', !slug && 'slug']
      .filter(Boolean) as string[]);

  // Verification (10)
  const verified = Boolean(input.is_verified) || input.approval_status === 'approved';
  push('verification', 10, verified ? 1 : 0,
    'التحقق والاعتماد', 'Verification & approval',
    verified ? [] : ['verification']);

  const score = components.reduce((s, c) => s + c.earned, 0);
  const band: ProductReadinessBand =
    score >= 85 ? 'ready' : score >= 65 ? 'good' : score >= 40 ? 'needs_work' : 'poor';
  const missingRequirements = components.flatMap((c) => c.missing);
  const weakest = [...components].sort((a, b) => a.ratio - b.ratio)[0] ?? null;
  const nextRecommendedAction = weakest && weakest.ratio < 1
    ? { key: weakest.key, ar: `حسّن: ${weakest.ar}`, en: `Improve: ${weakest.en}` }
    : null;

  return { score, band, components, missingRequirements, nextRecommendedAction };
}