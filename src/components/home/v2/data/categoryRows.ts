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
  'aluminum-glass': {
    titleAr: 'الألمنيوم والزجاج والواجهات',
    titleEn: 'Aluminum, glass & facades',
    subAr: 'نوافذ، أبواب، سيكوريت، واجهات وكلادينج.',
    subEn: 'Windows, doors, tempered glass, facades and cladding.',
    items: [
      { ar: 'ألمنيوم', en: 'Aluminum', slug: 'aluminum-works' },
      { ar: 'زجاج وسيكوريت', en: 'Glass & tempered', slug: 'glass-securit-works' },
      { ar: 'واجهات وكلادينج', en: 'Facades & cladding', slug: 'facades-cladding' },
      { ar: 'شبابيك وأبواب', en: 'Windows & doors', query: 'شبابيك ألمنيوم' },
    ],
  },
  'steel-stainless': {
    titleAr: 'الحديد والستانلس والمعادن',
    titleEn: 'Steel, stainless & metals',
    subAr: 'درابزين، أبواب، هياكل معدنية وأعمال خاصة.',
    subEn: 'Railings, doors, frames and custom metalwork.',
    items: [
      { ar: 'حديد ومعادن', en: 'Steel & metals', slug: 'steel-metal-works' },
      { ar: 'ستانلس ستيل', en: 'Stainless steel', slug: 'stainless-steel-works' },
      { ar: 'درابزين', en: 'Railings', query: 'درابزين' },
      { ar: 'هياكل معدنية', en: 'Metal frames', query: 'هياكل معدنية' },
    ],
  },
  'wood-kitchens': {
    titleAr: 'الخشب والنجارة',
    titleEn: 'Wood & carpentry',
    subAr: 'نجارة، دواليب وأبواب خشبية مفصّلة.',
    subEn: 'Carpentry, wardrobes and custom wood doors.',
    items: [
      { ar: 'خشب ونجارة', en: 'Wood & carpentry', slug: 'wood-carpentry' },
      { ar: 'أبواب خشبية', en: 'Wood doors', query: 'أبواب خشبية' },
      { ar: 'دواليب', en: 'Wardrobes', query: 'دواليب خشبية' },
    ],
  },
  'kitchens': {
    titleAr: 'المطابخ',
    titleEn: 'Kitchens',
    subAr: 'مطابخ خشبية، ألمنيوم، بولي لاك وتصاميم حديثة بالقياس.',
    subEn: 'Wood, aluminum, polylac and modern made-to-measure kitchens.',
    items: [
      { ar: 'مطابخ', en: 'Kitchens', slug: 'kitchens-works' },
      { ar: 'مطابخ ألمنيوم', en: 'Aluminum kitchens', query: 'مطابخ ألمنيوم' },
      { ar: 'مطابخ خشب', en: 'Wood kitchens', query: 'مطابخ خشب' },
      { ar: 'مطابخ بولي لاك', en: 'Polylac kitchens', query: 'مطابخ بولي لاك' },
    ],
  },
  'elevators-maintenance': {
    titleAr: 'المصاعد والصيانة',
    titleEn: 'Elevators & maintenance',
    subAr: 'مصاعد وسلالم كهربائية، تركيب وصيانة دورية.',
    subEn: 'Elevators, escalators, installation and periodic maintenance.',
    items: [
      { ar: 'مصاعد وصيانة', en: 'Elevators & maintenance', slug: 'elevators-maintenance' },
      { ar: 'تركيب مصاعد', en: 'Elevator install', query: 'تركيب مصاعد' },
      { ar: 'صيانة مصاعد', en: 'Elevator maintenance', query: 'صيانة مصاعد' },
    ],
  },
  'energy-sustainability': {
    titleAr: 'الطاقة والاستدامة',
    titleEn: 'Energy & sustainability',
    subAr: 'طاقة شمسية، عزل حراري وحلول استدامة للمباني.',
    subEn: 'Solar energy, thermal insulation and sustainability solutions.',
    items: [
      { ar: 'طاقة واستدامة', en: 'Energy & sustainability', slug: 'energy-sustainability' },
      { ar: 'طاقة شمسية', en: 'Solar energy', query: 'طاقة شمسية' },
      { ar: 'عزل حراري', en: 'Thermal insulation', query: 'عزل حراري' },
    ],
  },
  'technology-networks': {
    titleAr: 'التقنية والشبكات',
    titleEn: 'Technology & networks',
    subAr: 'شبكات، أنظمة ذكية، وبنية تحتية للاتصالات.',
    subEn: 'Networks, smart systems and communications infrastructure.',
    items: [
      { ar: 'تقنية وشبكات', en: 'Technology & networks', slug: 'technology-networks' },
      { ar: 'أنظمة ذكية', en: 'Smart systems', query: 'أنظمة ذكية' },
      { ar: 'شبكات', en: 'Networks', query: 'شبكات' },
    ],
  },
  'security-control-systems': {
    titleAr: 'أنظمة الحماية والتحكم',
    titleEn: 'Security & control systems',
    subAr: 'كاميرات مراقبة، إنذار، تحكم بالدخول وأنظمة أمنية متكاملة.',
    subEn: 'Surveillance, alarms, access control and integrated security.',
    items: [
      { ar: 'حماية وتحكم', en: 'Security & control', slug: 'security-control-systems' },
      { ar: 'كاميرات مراقبة', en: 'Surveillance cameras', query: 'كاميرات مراقبة' },
      { ar: 'أنظمة أمن', en: 'Security systems', query: 'أنظمة أمن' },
    ],
  },
  'equipment-rental': {
    titleAr: 'تأجير المعدات',
    titleEn: 'Equipment rental',
    subAr: 'معدات تشغيل، رافعات، سقالات، ومعدات موقع للتأجير.',
    subEn: 'Operating equipment, lifts, scaffolding, and site gear for rental.',
    items: [
      { ar: 'تأجير المعدات', en: 'Equipment rental', slug: 'equipment-rental' },
      { ar: 'رافعات', en: 'Cranes', query: 'رافعات' },
      { ar: 'سقالات', en: 'Scaffolding', query: 'سقالات' },
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
