/**
 * PROVIDER-GROWTH-ENGINE-1 — Part B
 *
 * Pure scoring helper. No Supabase imports. Callers pass a plain object.
 * Mirrors `PublishReadinessPanel` blockers — never introduces a stricter
 * publishing rule.
 *
 * Weights (total 100):
 *   Business Profile Completeness ─ 20
 *   Contact Quality               ─ 10
 *   Address Quality               ─ 10
 *   Images                        ─ 10
 *   Services                      ─ 15
 *   Brands                        ─ 10
 *   Verification Status           ─ 15
 *   SEO Readiness                 ─ 10
 */

export interface ReadinessInput {
  name_ar?: string | null;
  name_en?: string | null;
  username?: string | null;
  username_status?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  short_description_ar?: string | null;
  short_description_en?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  whatsapp?: string | null;
  city?: string | null;
  city_id?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  logo_url?: string | null;
  banner_url?: string | null;
  cover_url?: string | null;
  gallery_count?: number | null;
  sectors?: string[] | null;
  sub_services?: string[] | null;
  services_count?: number | null;
  brands_count?: number | null;
  verified?: boolean | null;
  is_verified?: boolean | null;
  approval_status?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  slug?: string | null;
}

export type ReadinessBand = 'poor' | 'needs_work' | 'good' | 'ready';

export interface ReadinessComponent {
  key:
    | 'profile_completeness'
    | 'contact_quality'
    | 'address_quality'
    | 'images'
    | 'services'
    | 'brands'
    | 'verification'
    | 'seo';
  weight: number;
  earned: number; // 0..weight
  ratio: number; // 0..1
  ar: string;
  en: string;
  missing: string[]; // requirement keys missing from this component
}

export interface ReadinessResult {
  score: number; // 0..100
  band: ReadinessBand;
  components: ReadinessComponent[];
  missingRequirements: string[];
  nextRecommendedAction: { key: string; ar: string; en: string } | null;
}

const NEXT_ACTIONS: Record<string, { ar: string; en: string }> = {
  name: { ar: 'أضف اسم المنشأة بالعربية', en: 'Add the business name' },
  username: { ar: 'اعتمد اسم المستخدم', en: 'Get your username approved' },
  sectors: { ar: 'اختر القطاعات', en: 'Choose your sectors' },
  services: { ar: 'أضف الخدمات الفرعية', en: 'Add sub-services' },
  contact: { ar: 'أضف وسيلة تواصل (هاتف أو بريد)', en: 'Add a contact method (phone or email)' },
  website: { ar: 'أضف موقعك الإلكتروني', en: 'Add your website' },
  city: { ar: 'حدد المدينة', en: 'Set your city' },
  coordinates: { ar: 'حدد موقعك على الخريطة', en: 'Drop a pin on the map' },
  address: { ar: 'أضف العنوان التفصيلي', en: 'Add a detailed address' },
  logo: { ar: 'ارفع شعار المنشأة', en: 'Upload your logo' },
  gallery: { ar: 'أضف صور للمعرض', en: 'Add gallery images' },
  brands: { ar: 'اربط العلامات التجارية', en: 'Link your brands' },
  verification: { ar: 'أكمل التوثيق', en: 'Complete verification' },
  seo_title: { ar: 'أضف عنوان SEO', en: 'Add an SEO title' },
  seo_description: { ar: 'أضف وصف SEO', en: 'Add an SEO description' },
};

function hasText(s: string | null | undefined, min = 1): boolean {
  return Boolean(s && s.trim().length >= min);
}

function ratioToEarned(ratio: number, weight: number): number {
  return Math.round(Math.max(0, Math.min(1, ratio)) * weight * 100) / 100;
}

function profileCompleteness(b: ReadinessInput): { ratio: number; missing: string[] } {
  const missing: string[] = [];
  let earned = 0;
  const checks: Array<[string, boolean, number]> = [
    ['name', hasText(b.name_ar) || hasText(b.name_en), 0.3],
    ['username', Boolean(b.username && b.username_status === 'approved'), 0.25],
    [
      'description',
      hasText(b.description_ar, 40) ||
        hasText(b.description_en, 40) ||
        hasText(b.short_description_ar, 40) ||
        hasText(b.short_description_en, 40),
      0.25,
    ],
    ['sectors', (b.sectors?.length ?? 0) > 0, 0.2],
  ];
  for (const [key, ok, w] of checks) {
    if (ok) earned += w;
    else missing.push(key);
  }
  return { ratio: earned, missing };
}

function contactQuality(b: ReadinessInput): { ratio: number; missing: string[] } {
  const missing: string[] = [];
  let r = 0;
  if (b.phone) r += 0.5;
  else missing.push('contact');
  if (b.email) r += 0.3;
  if (b.website) r += 0.2;
  else missing.push('website');
  return { ratio: r, missing };
}

function addressQuality(b: ReadinessInput): { ratio: number; missing: string[] } {
  const missing: string[] = [];
  let r = 0;
  if (b.city || b.city_id) r += 0.4;
  else missing.push('city');
  if (typeof b.latitude === 'number' && typeof b.longitude === 'number') r += 0.4;
  else missing.push('coordinates');
  if (hasText(b.address, 5)) r += 0.2;
  else missing.push('address');
  return { ratio: r, missing };
}

function imagesQuality(b: ReadinessInput): { ratio: number; missing: string[] } {
  const missing: string[] = [];
  let r = 0;
  if (b.logo_url) r += 0.4;
  else missing.push('logo');
  if (b.banner_url || b.cover_url) r += 0.2;
  const g = b.gallery_count ?? 0;
  if (g >= 3) r += 0.4;
  else if (g > 0) r += 0.2;
  else missing.push('gallery');
  return { ratio: r, missing };
}

function servicesQuality(b: ReadinessInput): { ratio: number; missing: string[] } {
  const missing: string[] = [];
  const sectors = b.sectors?.length ?? 0;
  const subs = b.sub_services?.length ?? b.services_count ?? 0;
  let r = 0;
  if (sectors > 0) r += 0.4;
  else missing.push('sectors');
  if (subs >= 3) r += 0.6;
  else if (subs > 0) r += 0.3;
  else missing.push('services');
  return { ratio: r, missing };
}

function brandsQuality(b: ReadinessInput): { ratio: number; missing: string[] } {
  const n = b.brands_count ?? 0;
  if (n >= 3) return { ratio: 1, missing: [] };
  if (n > 0) return { ratio: 0.5, missing: [] };
  return { ratio: 0, missing: ['brands'] };
}

function verificationQuality(b: ReadinessInput): { ratio: number; missing: string[] } {
  const verified = b.verified === true || b.is_verified === true;
  return verified ? { ratio: 1, missing: [] } : { ratio: 0, missing: ['verification'] };
}

function seoQuality(b: ReadinessInput): { ratio: number; missing: string[] } {
  const missing: string[] = [];
  let r = 0;
  if (hasText(b.seo_title, 10)) r += 0.4;
  else missing.push('seo_title');
  if (hasText(b.seo_description, 40)) r += 0.4;
  else missing.push('seo_description');
  if (b.slug || b.username) r += 0.2;
  return { ratio: r, missing };
}

const COMPONENT_DEFS: ReadonlyArray<{
  key: ReadinessComponent['key'];
  weight: number;
  ar: string;
  en: string;
  fn: (b: ReadinessInput) => { ratio: number; missing: string[] };
}> = [
  { key: 'profile_completeness', weight: 20, ar: 'اكتمال الملف', en: 'Profile completeness', fn: profileCompleteness },
  { key: 'contact_quality',      weight: 10, ar: 'جودة التواصل', en: 'Contact quality',       fn: contactQuality },
  { key: 'address_quality',      weight: 10, ar: 'جودة العنوان', en: 'Address quality',       fn: addressQuality },
  { key: 'images',               weight: 10, ar: 'الصور',        en: 'Images',                fn: imagesQuality },
  { key: 'services',             weight: 15, ar: 'الخدمات',      en: 'Services',              fn: servicesQuality },
  { key: 'brands',               weight: 10, ar: 'العلامات',     en: 'Brands',                fn: brandsQuality },
  { key: 'verification',         weight: 15, ar: 'التوثيق',      en: 'Verification',          fn: verificationQuality },
  { key: 'seo',                  weight: 10, ar: 'SEO',          en: 'SEO',                   fn: seoQuality },
];

export function computeProviderReadinessScore(b: ReadinessInput): ReadinessResult {
  const components: ReadinessComponent[] = COMPONENT_DEFS.map((def) => {
    const { ratio, missing } = def.fn(b);
    return {
      key: def.key,
      weight: def.weight,
      ratio,
      earned: ratioToEarned(ratio, def.weight),
      ar: def.ar,
      en: def.en,
      missing,
    };
  });

  const score = Math.round(components.reduce((sum, c) => sum + c.earned, 0));
  const band: ReadinessBand =
    score >= 80 ? 'ready' : score >= 60 ? 'good' : score >= 40 ? 'needs_work' : 'poor';

  const missingRequirements = components.flatMap((c) => c.missing);

  // Prioritise heaviest component with the lowest ratio.
  const worst = [...components]
    .filter((c) => c.ratio < 1 && c.missing.length > 0)
    .sort((a, b1) => b1.weight * (1 - b1.ratio) - a.weight * (1 - a.ratio))[0];
  const nextKey = worst?.missing[0];
  const nextRecommendedAction =
    nextKey && NEXT_ACTIONS[nextKey]
      ? { key: nextKey, ...NEXT_ACTIONS[nextKey] }
      : null;

  return { score, band, components, missingRequirements, nextRecommendedAction };
}

export const PROVIDER_READINESS_BANDS: ReadonlyArray<ReadinessBand> = [
  'poor',
  'needs_work',
  'good',
  'ready',
];