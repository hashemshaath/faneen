/**
 * قائمة كلمات مفتاحية مركزية لكل قطاع صناعي على منصة قِطاعات.
 * تُستخدم لإثراء meta keywords، وصف الصفحات، عناوين OG، وبيانات JSON-LD.
 *
 * كل قطاع يضم:
 *   - id        : معرّف ثابت يربط بالتصنيفات في قاعدة البيانات.
 *   - slug      : للروابط (?sector=aluminum).
 *   - name_ar/en: الاسم المعروض في الواجهة.
 *   - tagline   : وسم قصير لرؤوس الصفحات (≤ 60 حرفاً عربية).
 *   - description: وصف ميتا (140–160 حرفاً مثالياً).
 *   - keywords  : مصفوفة كلمات مفتاحية (ar+en) — تُسلسَل بفواصل.
 *   - relatedSlugs: قطاعات قريبة للربط الداخلي (مفيد للسيو).
 */

export type SectorSlug =
  | 'aluminum'
  | 'iron'
  | 'glass'
  | 'wood'
  | 'cabinets';

export interface SectorKeywordEntry {
  id: SectorSlug;
  slug: SectorSlug;
  name_ar: string;
  name_en: string;
  tagline_ar: string;
  tagline_en: string;
  description_ar: string;
  description_en: string;
  keywords_ar: string[];
  keywords_en: string[];
  relatedSlugs: SectorSlug[];
}

export const SECTOR_KEYWORDS: Record<SectorSlug, SectorKeywordEntry> = {
  aluminum: {
    id: 'aluminum',
    slug: 'aluminum',
    name_ar: 'الألمنيوم',
    name_en: 'Aluminum',
    tagline_ar: 'واجهات وأبواب ونوافذ ألمنيوم احترافية',
    tagline_en: 'Premium Aluminum Facades, Doors & Windows',
    description_ar:
      'دليل قِطاعات لمصانع وموردي وفنيي الألمنيوم في السعودية: واجهات كلادينج، أبواب سحاب، شبابيك، مظلات، ودرابزين بأعلى معايير الجودة.',
    description_en:
      'Qitaat directory for aluminum factories, suppliers, and installers in Saudi Arabia: cladding facades, sliding doors, windows, pergolas, and railings.',
    keywords_ar: [
      'ألمنيوم', 'قطاعات ألمنيوم', 'واجهات ألمنيوم', 'كلادينج', 'أبواب ألمنيوم',
      'شبابيك ألمنيوم', 'مظلات ألمنيوم', 'بروفايل ألمنيوم', 'ساكو', 'ثيرموبريك',
      'مصانع ألمنيوم', 'تركيب ألمنيوم',
    ],
    keywords_en: [
      'aluminum', 'aluminum profiles', 'aluminum facades', 'cladding',
      'aluminum doors', 'aluminum windows', 'pergolas', 'thermal break',
      'aluminum factories', 'aluminum installation',
    ],
    relatedSlugs: ['glass', 'iron'],
  },

  iron: {
    id: 'iron',
    slug: 'iron',
    name_ar: 'الحديد',
    name_en: 'Iron & Metalwork',
    tagline_ar: 'حدادة فنية وأبواب ودرابزينات حديد',
    tagline_en: 'Artistic Metalwork, Iron Doors & Railings',
    description_ar:
      'دليل قِطاعات لورش الحديد والحدادة الفنية: أبواب حديد، درابزينات، أسوار، مظلات، وشبكات حماية. تصاميم كلاسيكية وعصرية بأيدي حرفيين معتمدين.',
    description_en:
      'Qitaat directory for iron workshops and artistic metalwork: iron doors, railings, fences, canopies, and security grilles by certified craftsmen.',
    keywords_ar: [
      'حديد', 'حدادة', 'أبواب حديد', 'درابزين', 'درابزين حديد', 'أسوار حديد',
      'بوابات حديد', 'حدادة فنية', 'شبك حماية', 'مظلات حديد', 'ورش حديد',
      'ستيل', 'استيل',
    ],
    keywords_en: [
      'iron', 'metalwork', 'wrought iron', 'iron doors', 'railings',
      'iron gates', 'security grilles', 'steel fabrication', 'iron canopies',
      'blacksmith', 'metal workshops',
    ],
    relatedSlugs: ['aluminum', 'cabinets'],
  },

  glass: {
    id: 'glass',
    slug: 'glass',
    name_ar: 'الزجاج',
    name_en: 'Glass',
    tagline_ar: 'زجاج معماري ومرايا وحواجز ستركشر',
    tagline_en: 'Architectural Glass, Mirrors & Structural Glazing',
    description_ar:
      'دليل قِطاعات لموردي الزجاج المعماري: واجهات ستركشر، زجاج عازل، سيكوريت، مرايا، حواجز حمامات، ومطابخ. خدمات قص وتركيب متخصصة.',
    description_en:
      'Qitaat directory for architectural glass suppliers: structural glazing, insulated glass, tempered glass, mirrors, shower partitions, and cutting services.',
    keywords_ar: [
      'زجاج', 'زجاج سيكوريت', 'زجاج عازل', 'دبل جلاس', 'واجهات زجاج',
      'ستركشر جلاس', 'مرايا', 'حواجز زجاج', 'زجاج حمامات', 'زجاج مطابخ',
      'تركيب زجاج', 'موردي زجاج',
    ],
    keywords_en: [
      'glass', 'tempered glass', 'insulated glass', 'double glazing',
      'structural glazing', 'mirrors', 'shower partitions', 'glass facades',
      'glass cutting', 'glass suppliers',
    ],
    relatedSlugs: ['aluminum', 'cabinets'],
  },

  wood: {
    id: 'wood',
    slug: 'wood',
    name_ar: 'الخشب',
    name_en: 'Wood',
    tagline_ar: 'نجارة وأبواب وأرضيات خشبية فاخرة',
    tagline_en: 'Carpentry, Wooden Doors & Premium Flooring',
    description_ar:
      'دليل قِطاعات لورش النجارة وموردي الخشب: أبواب داخلية، أرضيات باركيه، أسقف، ديكورات HDF/MDF، ومنتجات خشب طبيعي ومعالج بأعلى جودة.',
    description_en:
      'Qitaat directory for carpentry workshops and wood suppliers: interior doors, parquet flooring, ceilings, HDF/MDF decor, and natural & engineered wood.',
    keywords_ar: [
      'خشب', 'نجارة', 'أبواب خشب', 'باركيه', 'أرضيات خشب', 'HDF', 'MDF',
      'أسقف خشب', 'ديكورات خشب', 'خشب طبيعي', 'خشب معالج', 'ورش نجارة',
    ],
    keywords_en: [
      'wood', 'carpentry', 'wooden doors', 'parquet', 'wood flooring',
      'HDF', 'MDF', 'wooden ceilings', 'wood decor', 'natural wood',
      'engineered wood', 'carpentry workshops',
    ],
    relatedSlugs: ['cabinets', 'iron'],
  },

  cabinets: {
    id: 'cabinets',
    slug: 'cabinets',
    name_ar: 'الخزائن',
    name_en: 'Cabinets & Wardrobes',
    tagline_ar: 'خزائن مطابخ وغرف نوم وحلول تخزين مخصصة',
    tagline_en: 'Kitchen Cabinets, Wardrobes & Custom Storage',
    description_ar:
      'دليل قِطاعات لمصممي ومصنّعي الخزائن: مطابخ ألمنيوم وخشب، خزائن غرف نوم بانوهات، خزائن مدخل، حلول تخزين ذكية، وكوارتز وكوريان.',
    description_en:
      'Qitaat directory for cabinet designers and manufacturers: aluminum & wood kitchens, panel wardrobes, entryway cabinets, smart storage, quartz & corian.',
    keywords_ar: [
      'خزائن', 'خزائن مطابخ', 'مطابخ ألمنيوم', 'مطابخ خشب', 'خزائن غرف نوم',
      'خزائن مدخل', 'دريسنج روم', 'كوارتز', 'كوريان', 'تفصيل خزائن',
      'خزائن مخصصة', 'وحدات تخزين',
    ],
    keywords_en: [
      'cabinets', 'kitchen cabinets', 'aluminum kitchens', 'wooden kitchens',
      'wardrobes', 'walk-in closets', 'dressing room', 'quartz', 'corian',
      'custom cabinets', 'storage units',
    ],
    relatedSlugs: ['wood', 'aluminum'],
  },
};

export const ALL_SECTORS: SectorKeywordEntry[] = Object.values(SECTOR_KEYWORDS);

/**
 * تطبيع النص العربي قبل المطابقة:
 *  - إزالة التشكيل والتنوين (الفتحة/الكسرة/الضمة/الشدة/السكون...).
 *  - توحيد الهمزات: أ/إ/آ → ا، ؤ → و، ئ → ي.
 *  - توحيد الألف المقصورة (ى → ي) والتاء المربوطة (ة → ه).
 *  - إزالة "ال" التعريف من بداية الكلمات (الألمنيوم → ألمنيوم).
 *  - حذف الفواصل العربية والأرقام العربية المحوّلة لإنجليزية.
 *  - تحويل لحروف صغيرة وضغط المسافات.
 */
export const normalizeArabic = (input: string): string => {
  if (!input) return '';
  let s = input.toLowerCase().trim();
  // Strip Arabic diacritics (Tashkeel) U+064B..U+065F + U+0670 + tatweel U+0640
  s = s.replace(/[\u064B-\u065F\u0670\u0640]/g, '');
  // Unify hamza forms
  s = s.replace(/[إأآٱ]/g, 'ا');
  s = s.replace(/ؤ/g, 'و');
  s = s.replace(/ئ/g, 'ي');
  s = s.replace(/ء/g, '');
  // Alef maksura → ya, ta marbuta → ha
  s = s.replace(/ى/g, 'ي');
  s = s.replace(/ة/g, 'ه');
  // Convert Arabic-Indic digits to ASCII
  s = s.replace(/[0-9]/g, (d) => String('0123456789'.indexOf(d)));
  // Strip leading "ال" definite article on whole words
  s = s.replace(/(^|\s)ال(?=\S)/g, '$1');
  // Collapse runs of repeated alef (e.g. "إأ" → "اا" → "ا")
  s = s.replace(/ا{2,}/g, 'ا');
  // Re-apply leading "ال" stripping in case the collapse exposed a new one
  s = s.replace(/(^|\s)ال(?=\S)/g, '$1');
  // Collapse non-alphanumeric (keep latin/arabic letters + space)
  s = s.replace(/[^\p{L}\p{N}\s]/gu, ' ');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
};

/**
 * معجم مرادفات شائعة → قطاع. تُطبَّق قبل البحث في keywords حتى تُلتقط
 * كتابات عامية/تجارية شائعة لا تظهر في القائمة الأساسية.
 * المفتاح هنا يجب أن يكون **مطبَّعاً** مسبقاً (normalizeArabic).
 */
const SYNONYM_MAP: Record<string, SectorSlug> = {
  // Aluminum
  'المنيوم': 'aluminum',
  'المونيوم': 'aluminum',
  'الومنيوم': 'aluminum',
  'الومينيوم': 'aluminum',
  'كلادنج': 'aluminum',
  'كلادينغ': 'aluminum',
  'سكاي لايت': 'aluminum',
  'سكايلايت': 'aluminum',
  'برجولات': 'aluminum',
  'برجوله': 'aluminum',
  'شيش حصيره': 'aluminum',
  'رول اب': 'aluminum',
  // Iron
  'حداد': 'iron',
  'حداده': 'iron',
  'مشغوله يدويه': 'iron',
  'بوابه': 'iron',
  'بوابات': 'iron',
  'هنجر': 'iron',
  'هناجر': 'iron',
  'مظله حديد': 'iron',
  // Glass
  'سكوريت': 'glass',
  'سيكورت': 'glass',
  'دبل قلاس': 'glass',
  'تمبرد': 'glass',
  'مرايا حمام': 'glass',
  'قاطع زجاج': 'glass',
  'كابينه شاور': 'glass',
  // Wood
  'خشاب': 'wood',
  'منجور': 'wood',
  'منجوره': 'wood',
  'ام دي اف': 'wood',
  'اتش دي اف': 'wood',
  'لامينيت': 'wood',
  'باركيه ارضيات': 'wood',
  // Cabinets
  'مطبخ': 'cabinets',
  'مطابخ': 'cabinets',
  'دولاب': 'cabinets',
  'دواليب': 'cabinets',
  'دريسنج': 'cabinets',
  'كاونتر': 'cabinets',
  'هاي قلوس': 'cabinets',
};

/** Pre-normalized lookup tables for fast matching (built once at module load). */
const SECTOR_NORMALIZED_KEYS: Array<{ slug: SectorSlug; tokens: string[] }> = ALL_SECTORS.map(
  (s) => ({
    slug: s.slug,
    tokens: Array.from(
      new Set(
        [s.name_ar, s.name_en, ...s.keywords_ar, ...s.keywords_en]
          .map((k) => normalizeArabic(k))
          .filter((k) => k.length >= 2),
      ),
    ),
  }),
);

/**
 * Returns the merged keyword string (AR + EN) ready for `<meta name="keywords">`.
 * De-duplicates and preserves order; safe to pass to `usePageMeta({ keywords })`.
 */
export const getSectorKeywords = (slug: SectorSlug): string => {
  const entry = SECTOR_KEYWORDS[slug];
  if (!entry) return '';
  const merged = [...entry.keywords_ar, ...entry.keywords_en];
  return Array.from(new Set(merged)).join(', ');
};

/**
 * Returns localized title + description + keywords + tagline for a given sector.
 * Use directly in pages/components: `usePageMeta(getSectorMeta('aluminum', isRTL))`.
 */
export const getSectorMeta = (
  slug: SectorSlug,
  isRTL: boolean,
): {
  title: string;
  description: string;
  keywords: string;
  tagline: string;
  name: string;
} => {
  const e = SECTOR_KEYWORDS[slug];
  return {
    title: isRTL
      ? `${e.name_ar} — ${e.tagline_ar} | قِطاعات`
      : `${e.name_en} — ${e.tagline_en} | Qitaat`,
    description: isRTL ? e.description_ar : e.description_en,
    keywords: getSectorKeywords(slug),
    tagline: isRTL ? e.tagline_ar : e.tagline_en,
    name: isRTL ? e.name_ar : e.name_en,
  };
};

/**
 * Heuristic: best-effort sector detection from a free-text query (e.g. search
 * input). Returns the matching slug or `null`. Matches both AR and EN keywords.
 */
export const detectSectorFromQuery = (query: string): SectorSlug | null => {
  if (!query || query.trim().length < 2) return null;
  const q = normalizeArabic(query);
  if (q.length < 2) return null;

  // 1) Synonym fast-path (exact or substring match against the normalized query).
  for (const [syn, slug] of Object.entries(SYNONYM_MAP)) {
    if (q === syn || q.includes(syn)) return slug;
  }

  // 2) Token match against the pre-normalized keyword bank.
  for (const sector of SECTOR_NORMALIZED_KEYS) {
    if (sector.tokens.some((k) => q === k || q.includes(k) || k.includes(q))) {
      return sector.slug;
    }
  }
  return null;
};

/**
 * Maps a category slug (from `public.categories.slug`) to a sector slug.
 * Used by `/categories/:slug` to inject sector-specific meta.
 * Falls back to keyword detection on the raw slug when no explicit map hits.
 */
const CATEGORY_SLUG_TO_SECTOR: Record<string, SectorSlug> = {
  // Aluminum family
  'aluminum': 'aluminum',
  'aluminum-windows': 'aluminum',
  'aluminum-doors': 'aluminum',
  'aluminum-facades': 'aluminum',
  'aluminum-shutters': 'aluminum',
  'aluminum-profiles': 'aluminum',
  // Iron family
  'iron-steel': 'iron',
  // Glass family
  'glass': 'glass',
  'securit-glass': 'glass',
  'double-glass': 'glass',
  'colored-glass': 'glass',
  'mirrors': 'glass',
  // Wood & cabinets
  'wood-cabinets': 'cabinets',
};

export const detectSectorFromCategorySlug = (
  categorySlug: string | null | undefined,
): SectorSlug | null => {
  if (!categorySlug) return null;
  const explicit = CATEGORY_SLUG_TO_SECTOR[categorySlug];
  if (explicit) return explicit;
  // Fall back to free-text heuristic on the slug itself ("aluminum-…", etc.)
  return detectSectorFromQuery(categorySlug.replace(/-/g, ' '));
};

/* -------------------------------------------------------------------------- */
/* Phase 2B — Canonical keyword coverage (13/13 canonical primaries)           */
/* -------------------------------------------------------------------------- */
/**
 * Canonical keyword bank keyed by `CANONICAL_PRIMARY_SLUGS`. Lives next to
 * the legacy `SECTOR_KEYWORDS` (5 legacy slugs) which keeps its existing
 * heuristic detection role. This map is the source of truth for canonical
 * meta keywords / descriptions per primary activity — no routes, no
 * search behavior changes.
 */
import {
  CANONICAL_PRIMARY_SLUGS,
  type CanonicalPrimarySlug,
} from '@/modules/taxonomy/canonical-primaries';

export interface CanonicalSectorKeywordEntry {
  canonicalSlug: CanonicalPrimarySlug;
  name_ar: string;
  name_en: string;
  tagline_ar: string;
  tagline_en: string;
  description_ar: string;
  description_en: string;
  keywords_ar: string[];
  keywords_en: string[];
}

export const SECTOR_KEYWORDS_CANONICAL: Record<
  CanonicalPrimarySlug,
  CanonicalSectorKeywordEntry
> = {
  'aluminum-works': {
    canonicalSlug: 'aluminum-works',
    name_ar: 'أعمال الألمنيوم',
    name_en: 'Aluminum works',
    tagline_ar: SECTOR_KEYWORDS.aluminum.tagline_ar,
    tagline_en: SECTOR_KEYWORDS.aluminum.tagline_en,
    description_ar: SECTOR_KEYWORDS.aluminum.description_ar,
    description_en: SECTOR_KEYWORDS.aluminum.description_en,
    keywords_ar: SECTOR_KEYWORDS.aluminum.keywords_ar,
    keywords_en: SECTOR_KEYWORDS.aluminum.keywords_en,
  },
  'glass-securit-works': {
    canonicalSlug: 'glass-securit-works',
    name_ar: 'أعمال الزجاج والسيكوريت',
    name_en: 'Glass & securit works',
    tagline_ar: SECTOR_KEYWORDS.glass.tagline_ar,
    tagline_en: SECTOR_KEYWORDS.glass.tagline_en,
    description_ar: SECTOR_KEYWORDS.glass.description_ar,
    description_en: SECTOR_KEYWORDS.glass.description_en,
    keywords_ar: SECTOR_KEYWORDS.glass.keywords_ar,
    keywords_en: SECTOR_KEYWORDS.glass.keywords_en,
  },
  'steel-metal-works': {
    canonicalSlug: 'steel-metal-works',
    name_ar: 'أعمال الحديد والمعادن',
    name_en: 'Steel & metal works',
    tagline_ar: SECTOR_KEYWORDS.iron.tagline_ar,
    tagline_en: SECTOR_KEYWORDS.iron.tagline_en,
    description_ar: SECTOR_KEYWORDS.iron.description_ar,
    description_en: SECTOR_KEYWORDS.iron.description_en,
    keywords_ar: SECTOR_KEYWORDS.iron.keywords_ar,
    keywords_en: SECTOR_KEYWORDS.iron.keywords_en,
  },
  'stainless-steel-works': {
    canonicalSlug: 'stainless-steel-works',
    name_ar: 'أعمال الستانلس ستيل',
    name_en: 'Stainless steel works',
    tagline_ar: 'تجهيزات ستانلس للمطاعم والمطابخ التجارية',
    tagline_en: 'Stainless steel for restaurants and commercial kitchens',
    description_ar:
      'دليل قِطاعات لمصنّعي الستانلس ستيل: تجهيزات مطاعم، طاولات، أحواض، درابزينات، وأعمال تفصيل خاصة للمطابخ التجارية.',
    description_en:
      'Qitaat directory for stainless steel fabricators: restaurant kit, tables, sinks, railings, and custom commercial-kitchen work.',
    keywords_ar: [
      'ستانلس ستيل', 'تجهيزات مطاعم', 'مطابخ تجارية', 'طاولات ستانلس',
      'احواض ستانلس', 'درابزين ستانلس', 'مصاعد طعام', 'تفصيل ستانلس',
    ],
    keywords_en: [
      'stainless steel', 'restaurant equipment', 'commercial kitchens',
      'stainless tables', 'stainless sinks', 'stainless railings',
      'food carts', 'custom stainless',
    ],
  },
  'wood-carpentry': {
    canonicalSlug: 'wood-carpentry',
    name_ar: 'أعمال الخشب والنجارة',
    name_en: 'Wood & carpentry',
    tagline_ar: SECTOR_KEYWORDS.wood.tagline_ar,
    tagline_en: SECTOR_KEYWORDS.wood.tagline_en,
    description_ar: SECTOR_KEYWORDS.wood.description_ar,
    description_en: SECTOR_KEYWORDS.wood.description_en,
    keywords_ar: SECTOR_KEYWORDS.wood.keywords_ar,
    keywords_en: SECTOR_KEYWORDS.wood.keywords_en,
  },
  'kitchens-works': {
    canonicalSlug: 'kitchens-works',
    name_ar: 'المطابخ',
    name_en: 'Kitchens',
    tagline_ar: 'تفصيل وتركيب مطابخ ألمنيوم وخشب وكوارتز',
    tagline_en: 'Custom kitchens: aluminum, wood, quartz, corian',
    description_ar:
      'دليل قِطاعات لمصنّعي ومركّبي المطابخ: مطابخ ألمنيوم، مطابخ خشب، بولي لاك، كوارتز، كوريان، وحلول تخزين للمطبخ الحديث.',
    description_en:
      'Qitaat directory for kitchen makers and installers: aluminum, wood, poly-lac, quartz, corian, and modern kitchen storage.',
    keywords_ar: [
      'مطابخ', 'تفصيل مطابخ', 'مطابخ المنيوم', 'مطابخ خشب', 'مطابخ بولي لاك',
      'كوارتز', 'كوريان', 'وحدات تخزين مطبخ',
    ],
    keywords_en: [
      'kitchens', 'custom kitchens', 'aluminum kitchens', 'wood kitchens',
      'poly-lac kitchens', 'quartz', 'corian', 'kitchen storage',
    ],
  },
  'facades-cladding': {
    canonicalSlug: 'facades-cladding',
    name_ar: 'الواجهات والكلادينج',
    name_en: 'Facades & cladding',
    tagline_ar: 'واجهات معمارية وكلادينج للمباني',
    tagline_en: 'Architectural facades and cladding',
    description_ar:
      'دليل قِطاعات للواجهات والكلادينج: ألوبوند، HPL، GRC، زجاج ستركشر، حجر صناعي، وحلول الواجهات للمباني التجارية والسكنية.',
    description_en:
      'Qitaat directory for facades and cladding: ALPolic, HPL, GRC, structural glazing, and façade solutions for commercial and residential buildings.',
    keywords_ar: [
      'واجهات', 'كلادينج', 'الوبوند', 'كلادينج HPL', 'GRC',
      'واجهات ستركشر', 'واجهات مباني', 'واجهات فلل',
    ],
    keywords_en: [
      'facades', 'cladding', 'aluminum composite', 'HPL cladding', 'GRC',
      'structural glazing', 'building facades', 'villa facades',
    ],
  },
  'contracting-finishing': {
    canonicalSlug: 'contracting-finishing',
    name_ar: 'المقاولات والتشطيبات',
    name_en: 'Contracting & finishing',
    tagline_ar: 'مقاولون وفِرَق تنفيذ وتشطيبات',
    tagline_en: 'Contractors and finishing crews',
    description_ar:
      'دليل قِطاعات للمقاولين وفِرَق التنفيذ والتشطيبات: مقاولو تشييد، تشطيبات داخلية، دهانات، أرضيات، أسقف، تجهيز محلات ومكاتب.',
    description_en:
      'Qitaat directory for contractors and finishing crews: construction contractors, interior finishing, paint, flooring, ceilings, shop & office fit-out.',
    keywords_ar: [
      'مقاولات', 'تشطيبات', 'تشطيب داخلي', 'دهانات', 'ارضيات',
      'اسقف معلقه', 'تجهيز محلات', 'تجهيز مكاتب', 'تنفيذ ديكور',
    ],
    keywords_en: [
      'contracting', 'finishing', 'interior finishing', 'paint', 'flooring',
      'suspended ceilings', 'shop fit-out', 'office fit-out', 'decor execution',
    ],
  },
  'elevators-maintenance': {
    canonicalSlug: 'elevators-maintenance',
    name_ar: 'المصاعد والصيانة',
    name_en: 'Elevators & maintenance',
    tagline_ar: 'تركيب وصيانة مصاعد وسلالم متحركة',
    tagline_en: 'Elevator and escalator install & maintenance',
    description_ar:
      'دليل قِطاعات للمصاعد والسلالم المتحركة: تركيب، صيانة دورية، قطع غيار، وعقود تشغيل للمباني السكنية والتجارية.',
    description_en:
      'Qitaat directory for elevators and escalators: installation, periodic maintenance, spare parts, and service contracts for residential and commercial buildings.',
    keywords_ar: [
      'مصاعد', 'صيانه مصاعد', 'تركيب مصاعد', 'سلالم متحركه',
      'عقد صيانه مصاعد', 'قطع غيار مصاعد',
    ],
    keywords_en: [
      'elevators', 'elevator maintenance', 'elevator installation',
      'escalators', 'maintenance contracts', 'elevator spare parts',
    ],
  },
  'energy-sustainability': {
    canonicalSlug: 'energy-sustainability',
    name_ar: 'الطاقة والاستدامة',
    name_en: 'Energy & sustainability',
    tagline_ar: 'حلول الطاقة الشمسية وكفاءة الطاقة',
    tagline_en: 'Solar and energy-efficiency solutions',
    description_ar:
      'دليل قِطاعات للطاقة والاستدامة: أنظمة شمسية، كفاءة طاقة، عزل حراري، إضاءة LED موفّرة للمنشآت السكنية والتجارية.',
    description_en:
      'Qitaat directory for energy & sustainability: solar PV systems, energy efficiency audits, thermal insulation, and LED lighting for residential and commercial sites.',
    keywords_ar: [
      'طاقه شمسيه', 'الواح شمسيه', 'كفاءه طاقه', 'عزل حراري',
      'اضاءه LED', 'استدامه', 'انظمه شمسيه',
    ],
    keywords_en: [
      'solar energy', 'solar panels', 'energy efficiency', 'thermal insulation',
      'LED lighting', 'sustainability', 'PV systems',
    ],
  },
  'technology-networks': {
    canonicalSlug: 'technology-networks',
    name_ar: 'التقنية والشبكات',
    name_en: 'Technology & networks',
    tagline_ar: 'شبكات بيانات واتصالات ومباني ذكية',
    tagline_en: 'Networking, communications, smart buildings',
    description_ar:
      'دليل قِطاعات للتقنية والشبكات: شبكات بيانات، كابلات نحاس وألياف ضوئية، سنترالات، واي فاي مؤسسي، وأنظمة المباني الذكية.',
    description_en:
      'Qitaat directory for technology & networks: data networking, copper & fiber cabling, PBX, enterprise Wi-Fi, and smart-building systems.',
    keywords_ar: [
      'شبكات', 'كابلات شبكات', 'فايبر', 'سنترال', 'واي فاي',
      'مباني ذكيه', 'تقنيه معلومات', 'بنيه تحتيه',
    ],
    keywords_en: [
      'networking', 'network cabling', 'fiber optics', 'PBX', 'Wi-Fi',
      'smart buildings', 'IT infrastructure', 'structured cabling',
    ],
  },
  'security-control-systems': {
    canonicalSlug: 'security-control-systems',
    name_ar: 'الأمن وأنظمة التحكم',
    name_en: 'Security & control systems',
    tagline_ar: 'كاميرات مراقبة وإنذار وتحكم بالوصول',
    tagline_en: 'CCTV, alarm, and access-control systems',
    description_ar:
      'دليل قِطاعات لأنظمة الأمن والتحكم: كاميرات مراقبة، إنذار حريق، تحكم بالدخول، بوابات أمنية، وحلول حماية متكاملة للمنشآت.',
    description_en:
      'Qitaat directory for security & control: CCTV cameras, fire alarms, access control, security gates, and integrated facility protection.',
    keywords_ar: [
      'كاميرات مراقبه', 'انذار حريق', 'تحكم بالدخول', 'بوابات امنيه',
      'انظمه امنيه', 'حمايه منشات',
    ],
    keywords_en: [
      'CCTV', 'fire alarm', 'access control', 'security gates',
      'security systems', 'facility protection',
    ],
  },
  'equipment-rental': {
    canonicalSlug: 'equipment-rental',
    name_ar: 'تأجير المعدات',
    name_en: 'Equipment rental',
    tagline_ar: 'تأجير معدات ثقيلة، رافعات، وسقالات',
    tagline_en: 'Heavy equipment, cranes, scaffolding rentals',
    description_ar:
      'دليل قِطاعات لتأجير المعدات: معدات ثقيلة، رافعات شوكية، سقالات، عربات النقل، ومعدات المواقع الإنشائية.',
    description_en:
      'Qitaat directory for equipment rental: heavy machinery, forklifts, scaffolding, hauling, and construction-site equipment.',
    keywords_ar: [
      'تاجير معدات', 'معدات ثقيله', 'رافعات', 'سقالات',
      'تاجير سقالات', 'تاجير رافعات شوكيه', 'معدات مواقع',
    ],
    keywords_en: [
      'equipment rental', 'heavy equipment', 'cranes', 'scaffolding',
      'forklift rental', 'site equipment', 'construction rentals',
    ],
  },
};

/** Returns the merged canonical keyword string (AR + EN) for a canonical primary. */
export const getCanonicalSectorKeywords = (slug: CanonicalPrimarySlug): string => {
  const e = SECTOR_KEYWORDS_CANONICAL[slug];
  if (!e) return '';
  return Array.from(new Set([...e.keywords_ar, ...e.keywords_en])).join(', ');
};

/** Sanity export for tests / inventories. */
export const CANONICAL_KEYWORD_COVERAGE = CANONICAL_PRIMARY_SLUGS.map(
  (s) => SECTOR_KEYWORDS_CANONICAL[s]?.canonicalSlug,
);
