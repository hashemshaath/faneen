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
  const q = query.toLowerCase().trim();
  for (const sector of ALL_SECTORS) {
    const all = [
      sector.name_ar, sector.name_en,
      ...sector.keywords_ar, ...sector.keywords_en,
    ].map((k) => k.toLowerCase());
    if (all.some((k) => q.includes(k) || k.includes(q))) return sector.slug;
  }
  return null;
};
