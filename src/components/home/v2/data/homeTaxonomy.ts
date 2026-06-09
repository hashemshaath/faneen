/**
 * homeTaxonomy.ts — SINGLE SOURCE OF TRUTH for every taxonomy slug used
 * on the homepage (Hero TRENDING, HomeSectorGrid, HomeCategoryRows,
 * JSON-LD ItemList in Index.tsx).
 *
 * Hard rules — enforced by `homeTaxonomyLinkGuard.test.ts`:
 *   1. Every slug here MUST exist in `public.taxonomy_categories.slug`
 *      with `is_active = true`. Do NOT add a slug that returns zero
 *      results in /search.
 *   2. Legacy shorthand slugs (`aluminum`, `iron`, `wood`, `glass`,
 *      `stainless`, `fabrication`) are FORBIDDEN — they don't exist
 *      in the taxonomy and produce dead links.
 *   3. No homepage component may hardcode `/search?category=<slug>`
 *      without going through `homeCategoryHref(slug)` or one of the
 *      derived lists below.
 *   4. To add a new specialty: append a `HomeTaxonomyEntry`, add it
 *      to the relevant group(s), and update the guard test's
 *      ALLOWED_SLUGS only if it represents a brand-new sector.
 *
 * TODO — pending real taxonomy slugs (do NOT add rows until DB exists):
 *   - "الطاقة والاستدامة" (Energy & Sustainability)
 *   - "المصاعد والسلالم الكهربائية" (Elevators & Escalators)
 */

export type HomeTaxonomyGroup =
  | 'aluminum-glass'
  | 'steel'
  | 'wood'
  | 'stainless'
  | 'contracting'
  | 'technology'
  | 'rental';

export interface HomeTaxonomyEntry {
  /** Real `taxonomy_categories.slug` — never legacy shorthand. */
  slug: string;
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
  group: HomeTaxonomyGroup;
  /** Free-text keywords surfaced as Hero TRENDING chips. */
  keywords?: { ar: string; en: string }[];
}

export const HOME_TAXONOMY: HomeTaxonomyEntry[] = [
  {
    slug: 'aluminum-glass-facades',
    labelAr: 'ألمنيوم وزجاج وواجهات',
    labelEn: 'Aluminum, Glass & Facades',
    descAr: 'ورش ومصانع الألمنيوم والزجاج: واجهات، نوافذ، أبواب، كيرتن وول، وسيكوريت.',
    descEn: 'Aluminum and glass workshops: facades, windows, doors, curtain walls and tempered glass.',
    group: 'aluminum-glass',
    keywords: [
      { ar: 'مصانع ألمنيوم في الرياض', en: 'Aluminum factories in Riyadh' },
      { ar: 'تركيب نوافذ ألمنيوم', en: 'Aluminum window installation' },
      { ar: 'واجهات زجاجية', en: 'Glass facades' },
      { ar: 'مظلات ألمنيوم', en: 'Aluminum canopies' },
    ],
  },
  {
    slug: 'steel-metal-works',
    labelAr: 'حديد ومعادن',
    labelEn: 'Steel & Metal Works',
    descAr: 'أعمال الحديد والتصنيع المعدني: درابزين، أبواب، هياكل، وأعمال مخصصة.',
    descEn: 'Steel and metal fabrication: railings, doors, frames and custom metalwork.',
    group: 'steel',
    keywords: [
      { ar: 'بوابات حديدية', en: 'Iron gates' },
      { ar: 'درابزين', en: 'Railings' },
    ],
  },
  {
    slug: 'wood-carpentry',
    labelAr: 'خشب ونجارة',
    labelEn: 'Wood & Carpentry',
    descAr: 'النجارة والمطابخ والدواليب وأبواب الخشب بمقاسات مخصّصة.',
    descEn: 'Carpentry, kitchens, wardrobes and wood doors — built to spec.',
    group: 'wood',
    keywords: [
      { ar: 'مطابخ خشبية', en: 'Wooden kitchens' },
      { ar: 'أبواب خشبية داخلية', en: 'Interior wooden doors' },
    ],
  },
  {
    slug: 'stainless-steel-fabrication',
    labelAr: 'ستانلس ستيل وتجهيزات',
    labelEn: 'Stainless Steel & Fabrication',
    descAr: 'تصنيع وتركيب الستانلس ستيل للمشاريع التجارية والصناعية والمطاعم.',
    descEn: 'Stainless steel fabrication and install for commercial, industrial and F&B projects.',
    group: 'stainless',
    keywords: [
      { ar: 'درابزين ستانلس ستيل', en: 'Stainless steel railings' },
    ],
  },
  {
    slug: 'contracting-finishing',
    labelAr: 'مقاولات وتشطيبات',
    labelEn: 'Contracting & Finishing',
    descAr: 'مقاولات وتشطيبات داخلية وخارجية، ودهانات وعزل وأرضيات.',
    descEn: 'Interior and exterior contracting and finishing — paint, insulation and flooring.',
    group: 'contracting',
  },
  {
    slug: 'technology-systems',
    labelAr: 'تقنية وأنظمة ذكية',
    labelEn: 'Technology & Smart Systems',
    descAr: 'أنظمة ذكية، كاميرات، شبكات، تحكم وأمن، وحلول تقنية للمباني والمشاريع.',
    descEn: 'Smart systems, cameras, networks, controls, security and building tech.',
    group: 'technology',
    keywords: [
      { ar: 'أنظمة ذكية', en: 'Smart systems' },
      { ar: 'كاميرات مراقبة', en: 'Surveillance cameras' },
    ],
  },
  {
    slug: 'heavy-equipment-rental',
    labelAr: 'تأجير المعدات',
    labelEn: 'Heavy Equipment & Rental',
    descAr: 'معدات ثقيلة، رافعات، سقالات، ومعدات موقع للتأجير.',
    descEn: 'Heavy equipment, cranes, scaffolding and site gear for rental.',
    group: 'rental',
    keywords: [
      { ar: 'رافعات', en: 'Cranes' },
    ],
  },
  // Supporting rental slugs — used only for row provider binding fallback.
  {
    slug: 'lifting',
    labelAr: 'معدات رفع ونقل',
    labelEn: 'Lifting & Transport',
    descAr: 'معدات الرفع والنقل لمواقع المشاريع.',
    descEn: 'Lifting and transport equipment for project sites.',
    group: 'rental',
  },
  {
    slug: 'scaffolding',
    labelAr: 'سقالات',
    labelEn: 'Scaffolding',
    descAr: 'سقالات ومنصات عمل آمنة للمواقع.',
    descEn: 'Scaffolding and safe work platforms.',
    group: 'rental',
  },
  {
    slug: 'equipment-rental-provider',
    labelAr: 'مزود معدات / تأجير',
    labelEn: 'Equipment / Rental Provider',
    descAr: 'مزودو معدات وتأجير للمشاريع والمنشآت.',
    descEn: 'Equipment and rental providers for projects and facilities.',
    group: 'rental',
  },
];

const HOME_TAXONOMY_BY_SLUG: Record<string, HomeTaxonomyEntry> = HOME_TAXONOMY.reduce(
  (acc, entry) => {
    acc[entry.slug] = entry;
    return acc;
  },
  {} as Record<string, HomeTaxonomyEntry>,
);

export const HOME_ALLOWED_SLUGS: ReadonlySet<string> = new Set(HOME_TAXONOMY.map((e) => e.slug));

export const HOME_FORBIDDEN_SLUGS: ReadonlySet<string> = new Set([
  'aluminum',
  'iron',
  'wood',
  'glass',
  'stainless',
  'fabrication',
]);

export const homeCategoryHref = (slug: string): string => {
  if (!HOME_ALLOWED_SLUGS.has(slug)) {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(`homeCategoryHref: "${slug}" is not in HOME_TAXONOMY`);
    }
  }
  return `/search?category=${slug}`;
};

export const getHomeTaxonomyEntry = (slug: string): HomeTaxonomyEntry | undefined =>
  HOME_TAXONOMY_BY_SLUG[slug];

/** The 6 sector tiles shown in HomeSectorGrid (image assets bound by consumer). */
export const HOME_SECTOR_GRID_SLUGS = [
  'aluminum-glass-facades',
  'steel-metal-works',
  'wood-carpentry',
  'aluminum-glass-facades',
  'stainless-steel-fabrication',
  'contracting-finishing',
] as const;

/** Row id -> primary + provider slugs. Consumed by categoryRows.ts. */
export const HOME_ROW_BINDINGS: ReadonlyArray<{
  rowId: string;
  primarySlug: string;
  providerSlugs: string[];
}> = [
  { rowId: 'iron-stainless',     primarySlug: 'steel-metal-works',      providerSlugs: ['steel-metal-works', 'stainless-steel-fabrication'] },
  { rowId: 'aluminum-glass',     primarySlug: 'aluminum-glass-facades', providerSlugs: ['aluminum-glass-facades'] },
  { rowId: 'facades-cladding',   primarySlug: 'aluminum-glass-facades', providerSlugs: ['aluminum-glass-facades'] },
  { rowId: 'kitchens-wood',      primarySlug: 'wood-carpentry',         providerSlugs: ['wood-carpentry'] },
  { rowId: 'fabrication',        primarySlug: 'contracting-finishing',  providerSlugs: ['contracting-finishing'] },
  { rowId: 'technology-systems', primarySlug: 'technology-systems',     providerSlugs: ['technology-systems'] },
  { rowId: 'equipment-rental',   primarySlug: 'heavy-equipment-rental', providerSlugs: ['heavy-equipment-rental', 'lifting', 'scaffolding', 'equipment-rental-provider'] },
];

/** Slugs that appear in JSON-LD ItemList on the homepage (Index.tsx). */
export const HOME_JSONLD_SLUGS = [
  'aluminum-glass-facades',
  'steel-metal-works',
  'wood-carpentry',
  'stainless-steel-fabrication',
  'contracting-finishing',
  'technology-systems',
  'heavy-equipment-rental',
] as const;

export interface HomeTrendingItem {
  ar: string;
  en: string;
  cat: string;
}

/** Hero TRENDING — derived from keywords[] in HOME_TAXONOMY. Never hardcoded. */
export const HOME_TRENDING: HomeTrendingItem[] = HOME_TAXONOMY.flatMap((entry) =>
  (entry.keywords ?? []).map((kw) => ({ ar: kw.ar, en: kw.en, cat: entry.slug })),
);
