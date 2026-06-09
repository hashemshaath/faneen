/**
 * homeTaxonomy.ts — SINGLE SOURCE OF TRUTH for every taxonomy slug used
 * on the homepage (Hero TRENDING, HomeSectorGrid, HomeCategoryRows,
 * JSON-LD ItemList in Index.tsx).
 *
 * Hard rules — enforced by `homeTaxonomyLinkGuard.test.ts`:
 *   1. Every slug here MUST exist in `public.taxonomy_categories.slug`
 *      with `is_active = true` AND `type = 'primary_activity'`.
 *   2. Legacy shorthand slugs (`aluminum`, `iron`, `wood`, `glass`,
 *      `stainless`, `fabrication`) and merged/archived slugs like
 *      `aluminum-glass-facades`, `stainless-steel-fabrication`,
 *      `technology-systems`, `heavy-equipment-rental` are FORBIDDEN
 *      as Home primaries — use the 13 canonical primary activities.
 *   3. No homepage component may hardcode `/search?category=<slug>`
 *      without going through `homeCategoryHref(slug)`.
 *
 * The 13 canonical primary activities (Taxonomy Restructure P1):
 *   aluminum-works, glass-securit-works, steel-metal-works,
 *   stainless-steel-works, wood-carpentry, kitchens-works,
 *   facades-cladding, contracting-finishing, elevators-maintenance,
 *   energy-sustainability, technology-networks,
 *   security-control-systems, equipment-rental.
 */

export type HomeTaxonomyGroup =
  | 'aluminum'
  | 'glass'
  | 'steel'
  | 'stainless'
  | 'wood'
  | 'kitchens'
  | 'facades'
  | 'contracting'
  | 'elevators'
  | 'energy'
  | 'technology'
  | 'security'
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
    slug: 'aluminum-works',
    labelAr: 'أعمال الألمنيوم',
    labelEn: 'Aluminum Works',
    descAr: 'ورش ومصانع الألمنيوم: نوافذ، أبواب، مطابخ ومظلات ألمنيوم.',
    descEn: 'Aluminum workshops and factories: windows, doors, kitchens and canopies.',
    group: 'aluminum',
    keywords: [
      { ar: 'مصانع ألمنيوم في الرياض', en: 'Aluminum factories in Riyadh' },
      { ar: 'تركيب نوافذ ألمنيوم', en: 'Aluminum window installation' },
      { ar: 'مظلات ألمنيوم', en: 'Aluminum canopies' },
    ],
  },
  {
    slug: 'glass-securit-works',
    labelAr: 'أعمال الزجاج والسيكوريت',
    labelEn: 'Glass & Tempered Glass',
    descAr: 'زجاج وسيكوريت: واجهات زجاجية، قواطع، أبواب وحمامات زجاج.',
    descEn: 'Glass and tempered glass: facades, partitions, doors and shower enclosures.',
    group: 'glass',
    keywords: [
      { ar: 'واجهات زجاجية', en: 'Glass facades' },
      { ar: 'سيكوريت', en: 'Tempered glass' },
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
    slug: 'stainless-steel-works',
    labelAr: 'ستانلس ستيل',
    labelEn: 'Stainless Steel Works',
    descAr: 'تصنيع وتركيب الستانلس ستيل للمشاريع التجارية والصناعية والمطاعم.',
    descEn: 'Stainless steel fabrication and install for commercial, industrial and F&B projects.',
    group: 'stainless',
    keywords: [
      { ar: 'درابزين ستانلس ستيل', en: 'Stainless steel railings' },
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
      { ar: 'أبواب خشبية داخلية', en: 'Interior wooden doors' },
    ],
  },
  {
    slug: 'kitchens-works',
    labelAr: 'المطابخ',
    labelEn: 'Kitchens',
    descAr: 'مطابخ ألمنيوم وستانلس وخشب — تصميم وتنفيذ وتركيب.',
    descEn: 'Aluminum, stainless and wood kitchens — design, build and install.',
    group: 'kitchens',
    keywords: [
      { ar: 'مطابخ ألمنيوم', en: 'Aluminum kitchens' },
      { ar: 'مطابخ خشبية', en: 'Wooden kitchens' },
    ],
  },
  {
    slug: 'facades-cladding',
    labelAr: 'الواجهات والكلادينج',
    labelEn: 'Facades & Cladding',
    descAr: 'واجهات تجارية وزجاجية وكلادينج ومظلات ومداخل.',
    descEn: 'Commercial fronts, glass facades, cladding, canopies and entrances.',
    group: 'facades',
    keywords: [
      { ar: 'كلادينج', en: 'Cladding' },
      { ar: 'واجهات تجارية', en: 'Storefronts' },
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
    slug: 'elevators-maintenance',
    labelAr: 'المصاعد والصيانة',
    labelEn: 'Elevators & Maintenance',
    descAr: 'مصاعد، سلالم كهربائية، تركيب وصيانة دورية للمباني والمنشآت.',
    descEn: 'Elevators, escalators, installation and periodic maintenance.',
    group: 'elevators',
    keywords: [
      { ar: 'مصاعد', en: 'Elevators' },
      { ar: 'صيانة مصاعد', en: 'Elevator maintenance' },
    ],
  },
  {
    slug: 'energy-sustainability',
    labelAr: 'الطاقة والاستدامة',
    labelEn: 'Energy & Sustainability',
    descAr: 'طاقة شمسية، عزل حراري، وحلول استدامة للمباني والمشاريع.',
    descEn: 'Solar energy, thermal insulation and sustainability solutions.',
    group: 'energy',
    keywords: [
      { ar: 'طاقة شمسية', en: 'Solar energy' },
      { ar: 'عزل حراري', en: 'Thermal insulation' },
    ],
  },
  {
    slug: 'technology-networks',
    labelAr: 'التقنية والشبكات',
    labelEn: 'Technology & Networks',
    descAr: 'حلول تقنية، شبكات، أنظمة ذكية وبنية تحتية للاتصالات.',
    descEn: 'Tech solutions, networks, smart systems and communications infrastructure.',
    group: 'technology',
    keywords: [
      { ar: 'أنظمة ذكية', en: 'Smart systems' },
      { ar: 'شبكات', en: 'Networks' },
    ],
  },
  {
    slug: 'security-control-systems',
    labelAr: 'أنظمة الحماية والتحكم',
    labelEn: 'Security & Control Systems',
    descAr: 'كاميرات مراقبة، إنذار، تحكم بالدخول وأنظمة أمنية متكاملة.',
    descEn: 'Surveillance cameras, alarms, access control and integrated security.',
    group: 'security',
    keywords: [
      { ar: 'كاميرات مراقبة', en: 'Surveillance cameras' },
      { ar: 'أنظمة أمن', en: 'Security systems' },
    ],
  },
  {
    slug: 'equipment-rental',
    labelAr: 'تأجير المعدات',
    labelEn: 'Equipment Rental',
    descAr: 'معدات ثقيلة، رافعات، سقالات، ومعدات موقع للتأجير.',
    descEn: 'Heavy equipment, cranes, scaffolding and site gear for rental.',
    group: 'rental',
    keywords: [
      { ar: 'رافعات', en: 'Cranes' },
      { ar: 'سقالات', en: 'Scaffolding' },
    ],
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
  // Legacy shorthand
  'aluminum',
  'iron',
  'wood',
  'glass',
  'stainless',
  'fabrication',
  // Archived / merged taxonomy slugs replaced by the 13 primary activities
  'aluminum-glass-facades',
  'stainless-steel-fabrication',
  'technology-systems',
  'heavy-equipment-rental',
  'iron-steel',
  'glass-securit',
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

/**
 * The 10 sector tiles shown in HomeSectorGrid (5 cols × 2 rows on desktop).
 * The remaining 3 canonical primaries (security-control-systems,
 * equipment-rental, contracting-finishing) stay reachable via the
 * "Explore all sectors" link below the grid and via HomeCategoryRows.
 */
export const HOME_SECTOR_GRID_SLUGS = [
  'aluminum-works',
  'glass-securit-works',
  'steel-metal-works',
  'stainless-steel-works',
  'wood-carpentry',
  'kitchens-works',
  'facades-cladding',
  'elevators-maintenance',
] as const;

/** Row id -> primary + provider slugs. Consumed by categoryRows.ts. */
export const HOME_ROW_BINDINGS: ReadonlyArray<{
  rowId: string;
  primarySlug: string;
  providerSlugs: string[];
}> = [
  { rowId: 'aluminum-glass',           primarySlug: 'aluminum-works',            providerSlugs: ['aluminum-works', 'glass-securit-works', 'facades-cladding'] },
  { rowId: 'steel-stainless',          primarySlug: 'steel-metal-works',         providerSlugs: ['steel-metal-works', 'stainless-steel-works'] },
  { rowId: 'wood-kitchens',            primarySlug: 'wood-carpentry',            providerSlugs: ['wood-carpentry', 'kitchens-works'] },
  { rowId: 'elevators-maintenance',    primarySlug: 'elevators-maintenance',     providerSlugs: ['elevators-maintenance'] },
  { rowId: 'energy-sustainability',    primarySlug: 'energy-sustainability',     providerSlugs: ['energy-sustainability'] },
  { rowId: 'technology-networks',      primarySlug: 'technology-networks',       providerSlugs: ['technology-networks'] },
  { rowId: 'security-control-systems', primarySlug: 'security-control-systems',  providerSlugs: ['security-control-systems'] },
  { rowId: 'equipment-rental',         primarySlug: 'equipment-rental',          providerSlugs: ['equipment-rental'] },
];

/** Slugs that appear in JSON-LD ItemList on the homepage (Index.tsx). */
export const HOME_JSONLD_SLUGS = [
  'aluminum-works',
  'glass-securit-works',
  'steel-metal-works',
  'stainless-steel-works',
  'wood-carpentry',
  'kitchens-works',
  'facades-cladding',
  'contracting-finishing',
  'elevators-maintenance',
  'energy-sustainability',
  'technology-networks',
  'security-control-systems',
  'equipment-rental',
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
