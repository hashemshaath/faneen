/**
 * Home category rows — derived from the single homeTaxonomy source.
 *
 * Every taxonomy slug used in rows MUST come from `HOME_ROW_BINDINGS` /
 * `HOME_TAXONOMY` in `homeTaxonomy.ts`. Components are forbidden from
 * inlining `/search?category=<slug>` strings — use `homeCategoryHref()`.
 *
 * UI copy (titles, descriptions, chip labels, free-text queries) lives
 * here. Taxonomy bindings (provider slugs, allHref slug) come from the
 * single source.
 *
 * TODO — pending real taxonomy slugs:
 *   - "الطاقة والاستدامة" (Energy & Sustainability)
 *   - "المصاعد والسلالم الكهربائية" (Elevators & Escalators)
 */
import {
  HOME_ROW_BINDINGS,
  homeCategoryHref,
  HOME_ALLOWED_SLUGS,
} from './homeTaxonomy';

export interface CategoryRowItem {
  ar: string;
  en: string;
  /** Either a taxonomy slug (?category=) or a free-text query (?q=). */
  slug?: string;
  query?: string;
}

export interface CategoryRow {
  id: string;
  titleAr: string;
  titleEn: string;
  subAr: string;
  subEn: string;
  /** Where the "View all" CTA links to (always built via homeCategoryHref). */
  allHref: string;
  /** Explicit taxonomy binding for provider cards. */
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

/** Per-row UI copy + chip items. Taxonomy bindings come from HOME_ROW_BINDINGS. */
interface RowCopy {
  titleAr: string;
  titleEn: string;
  subAr: string;
  subEn: string;
  items: CategoryRowItem[];
}

const ROW_COPY: Record<string, RowCopy> = {
  'iron-stainless': {
    titleAr: 'أعمال الحديد والستانلس ستيل',
    titleEn: 'Iron & stainless steel',
    subAr: 'درابزين، أبواب، هياكل معدنية وأعمال خاصة.',
    subEn: 'Railings, doors, frames and custom metalwork.',
    items: [
      { ar: 'حديد', en: 'Iron', slug: 'steel-metal-works' },
      { ar: 'ستانلس ستيل', en: 'Stainless steel', slug: 'stainless-steel-fabrication' },
      { ar: 'درابزين', en: 'Railings', query: 'درابزين' },
      { ar: 'أبواب حديد', en: 'Iron doors', query: 'أبواب حديد' },
      { ar: 'هياكل معدنية', en: 'Metal frames', query: 'هياكل معدنية' },
    ],
  },
  'aluminum-glass': {
    titleAr: 'الألمنيوم والزجاج والسيكوريت',
    titleEn: 'Aluminum, glass & tempered glass',
    subAr: 'واجهات، شبابيك، أبواب وقواطع.',
    subEn: 'Facades, windows, doors and partitions.',
    items: [
      { ar: 'ألمنيوم', en: 'Aluminum', slug: 'aluminum-glass-facades' },
      { ar: 'زجاج', en: 'Glass', slug: 'aluminum-glass-facades' },
      { ar: 'سيكوريت', en: 'Tempered glass', query: 'سيكوريت' },
      { ar: 'واجهات', en: 'Facades', query: 'واجهات' },
      { ar: 'شبابيك وأبواب', en: 'Windows & doors', query: 'شبابيك ألمنيوم' },
    ],
  },
  'facades-cladding': {
    titleAr: 'الواجهات والكلادينج',
    titleEn: 'Facades & cladding',
    subAr: 'واجهات تجارية، زجاجية، كلادينج ومظلات.',
    subEn: 'Commercial fronts, glass facades, cladding and canopies.',
    items: [
      { ar: 'واجهات تجارية', en: 'Storefronts', query: 'واجهات تجارية' },
      { ar: 'واجهات زجاجية', en: 'Glass facades', query: 'واجهات زجاجية' },
      { ar: 'كلادينج', en: 'Cladding', query: 'كلادينج' },
      { ar: 'مظلات', en: 'Canopies', query: 'مظلات' },
    ],
  },
  'kitchens-wood': {
    titleAr: 'المطابخ والخشب',
    titleEn: 'Kitchens & woodwork',
    subAr: 'مطابخ ألمنيوم وستانلس وخشب، أبواب وديكورات.',
    subEn: 'Aluminum / stainless / wood kitchens, doors and décor.',
    items: [
      { ar: 'خشب', en: 'Wood', slug: 'wood-carpentry' },
      { ar: 'مطابخ ألمنيوم', en: 'Aluminum kitchens', query: 'مطابخ ألمنيوم' },
      { ar: 'مطابخ ستانلس', en: 'Stainless kitchens', query: 'مطابخ ستانلس' },
      { ar: 'مطابخ خشب', en: 'Wood kitchens', query: 'مطابخ خشب' },
      { ar: 'أبواب خشبية', en: 'Wood doors', query: 'أبواب خشبية' },
    ],
  },
  fabrication: {
    titleAr: 'التصنيع والتركيب',
    titleEn: 'Fabrication & installation',
    subAr: 'ورش ومصانع وفرق تنفيذ متخصصة.',
    subEn: 'Workshops, factories and install crews.',
    items: [
      { ar: 'تصنيع وتركيب', en: 'Fabrication & install', slug: 'contracting-finishing' },
      { ar: 'ورش تصنيع', en: 'Fabrication shops', query: 'ورش تصنيع' },
      { ar: 'فرق تركيب', en: 'Install crews', query: 'فرق تركيب' },
    ],
  },
  'technology-systems': {
    titleAr: 'التقنية والأنظمة الذكية',
    titleEn: 'Technology & smart systems',
    subAr: 'أنظمة ذكية، كاميرات، شبكات، تحكم، أمن، وحلول تقنية للمباني والمشاريع.',
    subEn: 'Smart systems, cameras, networks, controls, security and building tech.',
    items: [
      { ar: 'تقنية وتجهيزات', en: 'Technology & systems', slug: 'technology-systems' },
      { ar: 'أنظمة ذكية', en: 'Smart systems', query: 'أنظمة ذكية' },
      { ar: 'كاميرات مراقبة', en: 'Surveillance cameras', query: 'كاميرات مراقبة' },
      { ar: 'شبكات', en: 'Networks', query: 'شبكات' },
      { ar: 'أنظمة أمن', en: 'Security systems', query: 'أنظمة أمن' },
    ],
  },
  'equipment-rental': {
    titleAr: 'تأجير المعدات',
    titleEn: 'Equipment rental',
    subAr: 'معدات تشغيل، رافعات، سقالات، معدات موقع، وحلول تأجير للمشاريع.',
    subEn: 'Operating equipment, lifts, scaffolding, site gear and rental solutions.',
    items: [
      { ar: 'معدات ثقيلة وتأجير', en: 'Heavy equipment & rental', slug: 'heavy-equipment-rental' },
      { ar: 'معدات رفع ونقل', en: 'Lifting & transport', slug: 'lifting' },
      { ar: 'سقالات', en: 'Scaffolding', slug: 'scaffolding' },
      { ar: 'مزود معدات / تأجير', en: 'Rental provider', slug: 'equipment-rental-provider' },
      { ar: 'رافعات', en: 'Cranes', query: 'رافعات' },
    ],
  },
};

/** Derive rows from HOME_ROW_BINDINGS — single source of truth for slugs. */
export const HOME_CATEGORY_ROWS: CategoryRow[] = HOME_ROW_BINDINGS.map((binding) => {
  const copy = ROW_COPY[binding.rowId];
  if (!copy) {
    throw new Error(`categoryRows: missing ROW_COPY for "${binding.rowId}"`);
  }
  return {
    id: binding.rowId,
    titleAr: copy.titleAr,
    titleEn: copy.titleEn,
    subAr: copy.subAr,
    subEn: copy.subEn,
    allHref: homeCategoryHref(binding.primarySlug),
    providerSlugs: binding.providerSlugs,
    items: copy.items,
  };
});

// Dev-time assertion: every chip slug must be an allowed taxonomy slug.
if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
  for (const row of HOME_CATEGORY_ROWS) {
    for (const item of row.items) {
      if (item.slug && !HOME_ALLOWED_SLUGS.has(item.slug)) {
        // eslint-disable-next-line no-console
        console.error(`[categoryRows] row "${row.id}" chip slug "${item.slug}" not in HOME_ALLOWED_SLUGS`);
      }
    }
  }
}
