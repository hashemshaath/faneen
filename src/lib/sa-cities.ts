/**
 * Major Saudi cities for /sectors/:sector/:city SEO landing pages.
 *
 * `slug` is the URL slug (kebab-case from name_en).
 * `nameEn` matches the `cities.name_en` column verbatim so we can resolve
 * the row at runtime without storing UUIDs in code.
 */
export interface SaCity {
  slug: string;
  nameAr: string;
  nameEn: string;
  /** Optional short locative ("في الرياض"); falls back to "في {nameAr}" if absent. */
  inAr?: string;
}

export const SA_CITIES: SaCity[] = [
  { slug: 'riyadh',        nameAr: 'الرياض',          nameEn: 'Riyadh',         inAr: 'في الرياض' },
  { slug: 'jeddah',        nameAr: 'جدة',             nameEn: 'Jeddah',         inAr: 'في جدة' },
  { slug: 'makkah',        nameAr: 'مكة المكرمة',      nameEn: 'Makkah',         inAr: 'في مكة' },
  { slug: 'madinah',       nameAr: 'المدينة المنورة', nameEn: 'Madinah',        inAr: 'في المدينة' },
  { slug: 'dammam',        nameAr: 'الدمام',           nameEn: 'Dammam',         inAr: 'في الدمام' },
  { slug: 'khobar',        nameAr: 'الخبر',            nameEn: 'Khobar',         inAr: 'في الخبر' },
  { slug: 'taif',          nameAr: 'الطائف',           nameEn: 'Taif',           inAr: 'في الطائف' },
  { slug: 'buraidah',      nameAr: 'بريدة',            nameEn: 'Buraidah',       inAr: 'في بريدة' },
  { slug: 'tabuk',         nameAr: 'تبوك',             nameEn: 'Tabuk',          inAr: 'في تبوك' },
  { slug: 'abha',          nameAr: 'أبها',             nameEn: 'Abha',           inAr: 'في أبها' },
  { slug: 'khamis-mushait', nameAr: 'خميس مشيط',       nameEn: 'Khamis Mushait', inAr: 'في خميس مشيط' },
  { slug: 'hail',          nameAr: 'حائل',             nameEn: 'Hail',           inAr: 'في حائل' },
  { slug: 'jazan',         nameAr: 'جازان',            nameEn: 'Jazan',          inAr: 'في جازان' },
  { slug: 'najran',        nameAr: 'نجران',            nameEn: 'Najran',         inAr: 'في نجران' },
  { slug: 'yanbu',         nameAr: 'ينبع',             nameEn: 'Yanbu',          inAr: 'في ينبع' },
];

export const CITY_BY_SLUG: Record<string, SaCity> = Object.fromEntries(
  SA_CITIES.map((c) => [c.slug, c]),
);

export function getCityBySlug(slug: string | undefined): SaCity | null {
  if (!slug) return null;
  return CITY_BY_SLUG[slug] ?? null;
}
