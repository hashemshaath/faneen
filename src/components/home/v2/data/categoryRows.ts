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
 *   aluminum-glass-facades, steel-metal-works, wood-carpentry,
 *   stainless-steel-fabrication, contracting-finishing,
 *   technology-systems, heavy-equipment-rental, lifting, scaffolding,
 *   equipment-rental-provider
 *
 * TODO (taxonomy gap — do NOT add a row until a real slug exists):
 *   - "الطاقة والاستدامة" (Energy & Sustainability) — no solar/energy
 *     taxonomy_categories slug exists yet. When added (e.g.
 *     `energy-sustainability`), reintroduce the row here and in the
 *     JSON-LD ItemList in src/pages/Index.tsx.
 *   - "المصاعد والسلالم الكهربائية" (Elevators & Escalators) — no
 *     elevators/escalators slug exists yet. Reintroduce once the
 *     taxonomy node is created.
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
  /** Optional explicit taxonomy binding for provider cards when chips are query-based. */
  providerSlugs?: string[];
  items: CategoryRowItem[];
}

const categorySlugFromHref = (href: string): string | null => {
  const match = href.match(/[?&]category=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

export const getCategoryRowTaxonomySlugs = (row: CategoryRow): string[] => {
  const slugs = new Set<string>();
  row.providerSlugs?.forEach((slug) => slugs.add(slug));
  const hrefSlug = categorySlugFromHref(row.allHref);
  if (hrefSlug) slugs.add(hrefSlug);
  row.items.forEach((item) => {
    if (item.slug) slugs.add(item.slug);
  });
  return Array.from(slugs);
};

export const HOME_CATEGORY_ROWS: CategoryRow[] = [
  {
    id: 'iron-stainless',
    titleAr: 'أعمال الحديد والستانلس ستيل',
    titleEn: 'Iron & stainless steel',
    subAr: 'درابزين، أبواب، هياكل معدنية وأعمال خاصة.',
    subEn: 'Railings, doors, frames and custom metalwork.',
    allHref: '/search?category=steel-metal-works',
    items: [
      { ar: 'حديد', en: 'Iron', slug: 'steel-metal-works' },
      { ar: 'ستانلس ستيل', en: 'Stainless steel', slug: 'stainless-steel-fabrication' },
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
    allHref: '/search?category=aluminum-glass-facades',
    items: [
      { ar: 'ألمنيوم', en: 'Aluminum', slug: 'aluminum-glass-facades' },
      { ar: 'زجاج', en: 'Glass', slug: 'aluminum-glass-facades' },
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
    providerSlugs: ['aluminum-glass-facades'],
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
    allHref: '/search?category=wood-carpentry',
    items: [
      { ar: 'خشب', en: 'Wood', slug: 'wood-carpentry' },
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
    allHref: '/search?category=contracting-finishing',
    items: [
      { ar: 'تصنيع وتركيب', en: 'Fabrication & install', slug: 'contracting-finishing' },
      { ar: 'ورش تصنيع', en: 'Fabrication shops', query: 'ورش تصنيع' },
      { ar: 'فرق تركيب', en: 'Install crews', query: 'فرق تركيب' },
    ],
  },
  {
    id: 'technology-systems',
    titleAr: 'التقنية والأنظمة الذكية',
    titleEn: 'Technology & smart systems',
    subAr: 'أنظمة ذكية، كاميرات، شبكات، تحكم، أمن، وحلول تقنية للمباني والمشاريع.',
    subEn: 'Smart systems, cameras, networks, controls, security and building tech.',
    allHref: '/search?category=technology-systems',
    items: [
      { ar: 'تقنية وتجهيزات', en: 'Technology & systems', slug: 'technology-systems' },
      { ar: 'أنظمة ذكية', en: 'Smart systems', query: 'أنظمة ذكية' },
      { ar: 'كاميرات مراقبة', en: 'Surveillance cameras', query: 'كاميرات مراقبة' },
      { ar: 'شبكات', en: 'Networks', query: 'شبكات' },
      { ar: 'أنظمة أمن', en: 'Security systems', query: 'أنظمة أمن' },
    ],
  },
  {
    id: 'equipment-rental',
    titleAr: 'تأجير المعدات',
    titleEn: 'Equipment rental',
    subAr: 'معدات تشغيل، رافعات، سقالات، معدات موقع، وحلول تأجير للمشاريع.',
    subEn: 'Operating equipment, lifts, scaffolding, site gear and rental solutions.',
    allHref: '/search?category=heavy-equipment-rental',
    providerSlugs: ['heavy-equipment-rental', 'lifting', 'scaffolding', 'equipment-rental-provider'],
    items: [
      { ar: 'معدات ثقيلة وتأجير', en: 'Heavy equipment & rental', slug: 'heavy-equipment-rental' },
      { ar: 'معدات رفع ونقل', en: 'Lifting & transport', slug: 'lifting' },
      { ar: 'سقالات', en: 'Scaffolding', slug: 'scaffolding' },
      { ar: 'مزود معدات / تأجير', en: 'Rental provider', slug: 'equipment-rental-provider' },
      { ar: 'رافعات', en: 'Cranes', query: 'رافعات' },
    ],
  },
];