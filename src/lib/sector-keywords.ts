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
