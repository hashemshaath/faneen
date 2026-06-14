import type {
  AdminColorField,
  ColorFieldDef,
  ColorSectionDef,
  ImageFieldKey,
  SizeFieldKey,
} from './types';

/** Admin labels for the three image asset slots. */
export const IMAGE_FIELD_META: Record<ImageFieldKey, { ar: string; en: string; desc: string }> = {
  fullLightUrl: { ar: 'الشعار الكامل (خلفية فاتحة)', en: 'Full Logo (light bg)', desc: 'يظهر على الخلفيات الفاتحة' },
  fullDarkUrl:  { ar: 'الشعار الكامل (خلفية معتمة)', en: 'Full Logo (dark bg)', desc: 'يظهر على الشريط العلوي والتذييل' },
  markUrl:      { ar: 'الرمز فقط (Icon)', en: 'Mark / Icon only', desc: 'يستخدم لشاشات التحميل والمصغرات' },
};

export const SIZE_LIMITS = { min: 24, max: 96 } as const;

export const SIZE_ROWS: Array<{ field: SizeFieldKey; ar: string; en: string }> = [
  { field: 'sizeNavbar', ar: 'الشريط العلوي', en: 'Top navbar' },
  { field: 'sizeFooter', ar: 'التذييل', en: 'Footer' },
  { field: 'sizeAuth', ar: 'صفحة الدخول', en: 'Auth page' },
  { field: 'sizeLoader', ar: 'شاشة التحميل', en: 'Loading screen' },
  { field: 'sizeMark', ar: 'الرمز (افتراضي)', en: 'Mark (default)' },
];

export const BRAND_GROUP: ColorFieldDef[] = [
  { key: 'primary',      ar: 'الأساسي (Primary)',          en: 'Primary',         desc: 'أزرار، روابط، تأكيدات' },
  { key: 'primaryHover', ar: 'الأساسي عند Hover',          en: 'Primary hover',   desc: 'حالة التحويم على الأزرار' },
  { key: 'primaryDark',  ar: 'الأساسي الداكن',             en: 'Primary dark',    desc: 'تدرجات وعمق' },
  { key: 'secondary',    ar: 'الثانوي (Secondary)',        en: 'Secondary',       desc: 'الأزرق الصناعي' },
  { key: 'secondaryDark',ar: 'الثانوي الداكن',             en: 'Secondary dark',  desc: 'تدرجات' },
  { key: 'accent',       ar: 'التمييز (Accent)',           en: 'Accent',          desc: 'CTA عاجل أو مميّز' },
  { key: 'accentHover',  ar: 'التمييز عند Hover',          en: 'Accent hover',    desc: 'حالة التحويم للـ accent' },
];

export const NEUTRAL_GROUP: ColorFieldDef[] = [
  { key: 'background', ar: 'خلفية الصفحة',     en: 'Background',  desc: 'خلفية body العامة' },
  { key: 'surface',    ar: 'سطح البطاقات',     en: 'Surface',     desc: 'بطاقات، Inputs' },
  { key: 'text',       ar: 'النص الأساسي',     en: 'Text',        desc: 'العناوين والمتن' },
  { key: 'textMuted',  ar: 'النص الباهت',      en: 'Muted text',  desc: 'الأوصاف والنصوص الثانوية' },
  { key: 'border',     ar: 'الحدود',           en: 'Border',      desc: 'حدود البطاقات والـ Inputs' },
];

export const STATUS_GROUP: ColorFieldDef[] = [
  { key: 'success', ar: 'نجاح',  en: 'Success', desc: 'حالات النجاح' },
  { key: 'warning', ar: 'تنبيه', en: 'Warning', desc: 'حالات التحذير' },
  { key: 'error',   ar: 'خطأ',   en: 'Error',   desc: 'حالات الخطأ' },
  { key: 'info',    ar: 'معلومة',en: 'Info',    desc: 'حالات إعلامية' },
];

export const ALL_COLOR_FIELDS: ColorFieldDef[] = [...BRAND_GROUP, ...NEUTRAL_GROUP, ...STATUS_GROUP];

export const ALL_COLOR_KEYS: AdminColorField[] = ALL_COLOR_FIELDS.map((f) => f.key);

export const COLOR_SECTIONS: ColorSectionDef[] = [
  { title_ar: 'ألوان الهوية',   title_en: 'Brand colors',   group: BRAND_GROUP, isBrand: true },
  { title_ar: 'الألوان المحايدة', title_en: 'Neutral colors', group: NEUTRAL_GROUP },
  { title_ar: 'ألوان الحالات',   title_en: 'Status colors',  group: STATUS_GROUP },
];