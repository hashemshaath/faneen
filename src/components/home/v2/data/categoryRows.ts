/**
 * Home category rows — lightweight static data used by HomeCategoryRow.
 * Each item links to `/search?category=<slug>` when the slug matches a
 * known taxonomy slug, otherwise to `/search?q=<term>` which is always
 * safe (the search page treats unknown queries as text input).
 *
 * Adding a new row doesn't require any DB change — but if you reference
 * a slug that doesn't exist in taxonomy, the search page will simply
 * return zero results rather than 404.
 *
 * Known taxonomy slugs (kept in sync with MainSectors / SEO JSON-LD):
 *   aluminum, iron, wood, glass, stainless, fabrication
 */

export interface CategoryRowItem {
  /** UI label (AR/EN bilingual via useBi) */
  ar: string;
  en: string;
  /** Either a taxonomy slug (?category=) or a free-text query (?q=) */
  slug?: string;
  query?: string;
}

export interface CategoryRow {
  id: string;
  titleAr: string;
  titleEn: string;
  subAr: string;
  subEn: string;
  /** Where the "View all" CTA links to */
  allHref: string;
  items: CategoryRowItem[];
}

export const HOME_CATEGORY_ROWS: CategoryRow[] = [
  {
    id: 'iron-stainless',
    titleAr: 'أعمال الحديد والستانلس ستيل',
    titleEn: 'Iron & stainless steel',
    subAr: 'درابزين، أبواب، هياكل معدنية وأعمال خاصة.',
    subEn: 'Railings, doors, frames and custom metalwork.',
    allHref: '/search?category=iron',
    items: [
      { ar: 'حديد', en: 'Iron', slug: 'iron' },
      { ar: 'ستانلس ستيل', en: 'Stainless steel', slug: 'stainless' },
      { ar: 'درابزين', en: 'Railings', query: 'درابزين' },
      { ar: 'أبواب حديد', en: 'Iron doors', query: 'أبواب حديد' },
      { ar: 'هياكل معدنية', en: 'Metal frames', query: 'هياكل معدنية' },
    ],
  },
  {
    id: 'aluminum-glass',
    titleAr: 'الألمنيوم والزجاج والسيكوريت',
    titleEn: 'Aluminum, glass & tempered glass',
    subAr: 'واجهات، شبابيك، أبواب وقواطع.',
    subEn: 'Facades, windows, doors and partitions.',
    allHref: '/search?category=aluminum',
    items: [
      { ar: 'ألمنيوم', en: 'Aluminum', slug: 'aluminum' },
      { ar: 'زجاج', en: 'Glass', slug: 'glass' },
      { ar: 'سيكوريت', en: 'Tempered glass', query: 'سيكوريت' },
      { ar: 'واجهات', en: 'Facades', query: 'واجهات' },
      { ar: 'شبابيك وأبواب', en: 'Windows & doors', query: 'شبابيك ألمنيوم' },
    ],
  },
  {
    id: 'facades-cladding',
    titleAr: 'الواجهات والكلادينج',
    titleEn: 'Facades & cladding',
    subAr: 'واجهات تجارية، زجاجية، كلادينج ومظلات.',
    subEn: 'Commercial fronts, glass facades, cladding and canopies.',
    allHref: '/search?q=واجهات',
    items: [
      { ar: 'واجهات تجارية', en: 'Storefronts', query: 'واجهات تجارية' },
      { ar: 'واجهات زجاجية', en: 'Glass facades', query: 'واجهات زجاجية' },
      { ar: 'كلادينج', en: 'Cladding', query: 'كلادينج' },
      { ar: 'مظلات', en: 'Canopies', query: 'مظلات' },
    ],
  },
  {
    id: 'kitchens-wood',
    titleAr: 'المطابخ والخشب',
    titleEn: 'Kitchens & woodwork',
    subAr: 'مطابخ ألمنيوم وستانلس وخشب، أبواب وديكورات.',
    subEn: 'Aluminum / stainless / wood kitchens, doors and décor.',
    allHref: '/search?category=wood',
    items: [
      { ar: 'خشب', en: 'Wood', slug: 'wood' },
      { ar: 'مطابخ ألمنيوم', en: 'Aluminum kitchens', query: 'مطابخ ألمنيوم' },
      { ar: 'مطابخ ستانلس', en: 'Stainless kitchens', query: 'مطابخ ستانلس' },
      { ar: 'مطابخ خشب', en: 'Wood kitchens', query: 'مطابخ خشب' },
      { ar: 'أبواب خشبية', en: 'Wood doors', query: 'أبواب خشبية' },
    ],
  },
  {
    id: 'fabrication',
    titleAr: 'التصنيع والتركيب',
    titleEn: 'Fabrication & installation',
    subAr: 'ورش ومصانع وفرق تنفيذ متخصصة.',
    subEn: 'Workshops, factories and install crews.',
    allHref: '/search?category=fabrication',
    items: [
      { ar: 'تصنيع وتركيب', en: 'Fabrication & install', slug: 'fabrication' },
      { ar: 'ورش تصنيع', en: 'Fabrication shops', query: 'ورش تصنيع' },
      { ar: 'فرق تركيب', en: 'Install crews', query: 'فرق تركيب' },
    ],
  },
];