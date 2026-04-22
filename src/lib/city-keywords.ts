/**
 * كلمات مفتاحية محلية حسب المدينة/المنطقة الجغرافية في السعودية.
 * تُستخدم لإثراء meta keywords ديناميكياً حين يختار المستخدم مدينة من
 * فلتر البحث، مما يجعل صفحات النتائج أكثر صلة بالموقع الجغرافي وأقوى
 * في كلمات البحث المحلية مثل "ألمنيوم الرياض" أو "زجاج جدة".
 *
 * الربط يتم بـ slug للمدينة (مشتق من name_en بحروف صغيرة) لتفادي
 * الاعتماد على معرّفات UUID، وكذلك مرادفات شائعة من name_ar.
 */

export type RegionSlug =
  | 'central'   // الوسطى — الرياض، القصيم، حائل
  | 'western'   // الغربية — مكة، جدة، الطائف، المدينة، ينبع
  | 'eastern'   // الشرقية — الدمام، الخبر
  | 'southern'  // الجنوبية — أبها، خميس مشيط، جازان، نجران
  | 'northern'; // الشمالية — تبوك

export interface CityKeywordEntry {
  /** مرادفات قابلة للمطابقة على name_ar / name_en (lowercase) */
  match: string[];
  name_ar: string;
  name_en: string;
  region: RegionSlug;
  region_ar: string;
  region_en: string;
  /** كلمات مفتاحية مخصصة للمدينة بالعربية والإنجليزية */
  keywords_ar: string[];
  keywords_en: string[];
}

const REGION_LABELS: Record<RegionSlug, { ar: string; en: string; kw_ar: string[]; kw_en: string[] }> = {
  central:  { ar: 'المنطقة الوسطى',   en: 'Central Region',  kw_ar: ['وسط السعودية', 'منطقة الرياض'],     kw_en: ['central saudi', 'riyadh region'] },
  western:  { ar: 'المنطقة الغربية',  en: 'Western Region',  kw_ar: ['غرب السعودية', 'منطقة مكة'],         kw_en: ['western saudi', 'makkah region'] },
  eastern:  { ar: 'المنطقة الشرقية',  en: 'Eastern Region',  kw_ar: ['شرق السعودية', 'المنطقة الشرقية'],  kw_en: ['eastern saudi', 'eastern province'] },
  southern: { ar: 'المنطقة الجنوبية', en: 'Southern Region', kw_ar: ['جنوب السعودية', 'منطقة عسير'],      kw_en: ['southern saudi', 'asir region'] },
  northern: { ar: 'المنطقة الشمالية', en: 'Northern Region', kw_ar: ['شمال السعودية', 'منطقة تبوك'],      kw_en: ['northern saudi', 'tabuk region'] },
};

const buildEntry = (
  name_ar: string,
  name_en: string,
  region: RegionSlug,
  extraAr: string[] = [],
  extraEn: string[] = [],
): CityKeywordEntry => ({
  match: [name_ar.toLowerCase(), name_en.toLowerCase(), ...extraAr.map((s) => s.toLowerCase()), ...extraEn.map((s) => s.toLowerCase())],
  name_ar,
  name_en,
  region,
  region_ar: REGION_LABELS[region].ar,
  region_en: REGION_LABELS[region].en,
  keywords_ar: [
    name_ar,
    `${name_ar} السعودية`,
    `مزودي خدمات ${name_ar}`,
    `أفضل مصانع ${name_ar}`,
    `محلات ${name_ar}`,
    REGION_LABELS[region].ar,
    ...REGION_LABELS[region].kw_ar,
    ...extraAr,
  ],
  keywords_en: [
    name_en,
    `${name_en} Saudi Arabia`,
    `${name_en} providers`,
    `${name_en} factories`,
    `${name_en} workshops`,
    REGION_LABELS[region].en,
    ...REGION_LABELS[region].kw_en,
    ...extraEn,
  ],
});

/**
 * فهرس المدن المعروفة. يُمكن توسيعه بسهولة بإضافة مدن جديدة دون لمس
 * منطق الاستدعاء.
 */
export const CITY_KEYWORDS: CityKeywordEntry[] = [
  buildEntry('الرياض',          'Riyadh',         'central',  ['العاصمة'], ['capital']),
  buildEntry('بريدة',           'Buraidah',       'central',  ['القصيم'],  ['qassim']),
  buildEntry('حائل',            'Hail',           'central'),
  buildEntry('جدة',             'Jeddah',         'western',  ['عروس البحر الأحمر'], ['red sea']),
  buildEntry('مكة المكرمة',     'Makkah',         'western',  ['مكة'], ['mecca']),
  buildEntry('المدينة المنورة', 'Madinah',        'western',  ['المدينة'], ['medina']),
  buildEntry('الطائف',          'Taif',           'western'),
  buildEntry('ينبع',            'Yanbu',          'western'),
  buildEntry('الدمام',          'Dammam',         'eastern'),
  buildEntry('الخبر',           'Khobar',         'eastern',  ['الخُبر'], ['al-khobar']),
  buildEntry('أبها',            'Abha',           'southern', ['عسير'], ['asir']),
  buildEntry('خميس مشيط',       'Khamis Mushait', 'southern'),
  buildEntry('جازان',           'Jazan',          'southern', ['جيزان'], []),
  buildEntry('نجران',           'Najran',         'southern'),
  buildEntry('تبوك',            'Tabuk',          'northern', ['نيوم'], ['neom']),
];

/**
 * يبحث عن مدينة بناءً على أي من الحقلين name_ar / name_en
 * (تجاهل حالة الأحرف). يعيد `null` عند عدم التطابق.
 */
export const findCityKeywords = (
  cityName: string | null | undefined,
): CityKeywordEntry | null => {
  if (!cityName) return null;
  const q = cityName.toLowerCase().trim();
  if (!q) return null;
  for (const entry of CITY_KEYWORDS) {
    if (entry.match.some((m) => m === q || q.includes(m) || m.includes(q))) {
      return entry;
    }
  }
  return null;
};

/**
 * يعيد سلسلة كلمات مفتاحية جاهزة لـ <meta name="keywords">.
 * يدمج كلمات المدينة (AR + EN) مع إزالة التكرار.
 */
export const getCityKeywordsString = (entry: CityKeywordEntry): string => {
  const merged = [...entry.keywords_ar, ...entry.keywords_en];
  return Array.from(new Set(merged)).join(', ');
};

/**
 * يدمج كلمات قطاع وكلمات مدينة في مجموعة واحدة (مع إزالة التكرار).
 * يعطي الأولوية للقطاع ثم المدينة لأن نية المستخدم الأساسية هي الخدمة،
 * والمدينة تأتي كمحدّد جغرافي.
 */
export const mergeKeywords = (
  ...sources: Array<string | string[] | null | undefined>
): string => {
  const all: string[] = [];
  for (const src of sources) {
    if (!src) continue;
    if (Array.isArray(src)) all.push(...src);
    else all.push(...src.split(',').map((s) => s.trim()).filter(Boolean));
  }
  return Array.from(new Set(all)).join(', ');
};