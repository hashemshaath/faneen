import { z } from 'zod';

/**
 * Saudi-specific identifier validators.
 *  - VAT: 15 digits, starts with 3, ends with 3, the 11th digit (index 10) is 3 (ZATCA spec).
 *  - CR (Commercial Registration): 10 digits.
 *  - Unified national number: 10 digits, starts with 7.
 */
const onlyDigits = (s: string) => s.replace(/\D/g, '');

export const vatSchema = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d{15}$/.test(onlyDigits(v)), {
    message: 'VAT_LENGTH',
  })
  .refine(
    (v) => {
      if (v === '') return true;
      const d = onlyDigits(v);
      return d.startsWith('3') && d.endsWith('3') && d[10] === '3';
    },
    { message: 'VAT_FORMAT' },
  );

export const crSchema = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d{10}$/.test(onlyDigits(v)), { message: 'CR_LENGTH' });

export const unifiedSchema = z
  .string()
  .trim()
  .refine((v) => v === '' || /^7\d{9}$/.test(onlyDigits(v)), { message: 'UNIFIED_FORMAT' });

export const phoneSchema = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\+?\d[\d\s-]{6,18}\d$/.test(v), { message: 'PHONE_FORMAT' });

export const emailSchema = z
  .string()
  .trim()
  .refine((v) => v === '' || z.string().email().safeParse(v).success, { message: 'EMAIL_FORMAT' });

export const urlSchema = z
  .string()
  .trim()
  .refine(
    (v) => v === '' || /^https?:\/\/[^\s]+\.[^\s]+/i.test(v),
    { message: 'URL_FORMAT' },
  );

export type ValidationKey =
  | 'name_ar'
  | 'name_en'
  | 'national_id'
  | 'unified_number'
  | 'vat_number'
  | 'phone'
  | 'mobile'
  | 'customer_service_phone'
  | 'email'
  | 'website'
  | 'account_manager_email'
  | 'account_manager_phone'
  | 'description_ar_en'
  | 'short_description_ar_en'
  | 'region_ar_en'
  | 'address_ar_en'
  | 'coordinates';

export type ValidationCode =
  | 'REQUIRED'
  | 'VAT_LENGTH'
  | 'VAT_FORMAT'
  | 'CR_LENGTH'
  | 'UNIFIED_FORMAT'
  | 'PHONE_FORMAT'
  | 'EMAIL_FORMAT'
  | 'URL_FORMAT'
  | 'BILINGUAL_MISSING'
  | 'COORDS_MISSING'
  | 'COORDS_INVALID';

export interface ValidationIssue {
  key: ValidationKey;
  code: ValidationCode;
  severity: 'error' | 'warning';
}

const messages: Record<ValidationCode, { ar: string; en: string }> = {
  REQUIRED: { ar: 'هذا الحقل مطلوب', en: 'This field is required' },
  VAT_LENGTH: { ar: 'يجب أن يتكوّن الرقم الضريبي من 15 رقمًا', en: 'VAT number must be 15 digits' },
  VAT_FORMAT: {
    ar: 'صيغة الرقم الضريبي غير صحيحة (يبدأ بـ 3 وينتهي بـ 3 والرقم 11 = 3)',
    en: 'Invalid VAT format (must start with 3, end with 3, and 11th digit = 3)',
  },
  CR_LENGTH: { ar: 'يجب أن يتكوّن السجل التجاري من 10 أرقام', en: 'CR number must be 10 digits' },
  UNIFIED_FORMAT: {
    ar: 'الرقم الموحّد يجب أن يبدأ بـ 7 ويتكوّن من 10 أرقام',
    en: 'Unified number must start with 7 and be 10 digits',
  },
  PHONE_FORMAT: { ar: 'صيغة رقم الهاتف غير صحيحة', en: 'Invalid phone number format' },
  EMAIL_FORMAT: { ar: 'صيغة البريد الإلكتروني غير صحيحة', en: 'Invalid email format' },
  URL_FORMAT: { ar: 'يجب أن يبدأ الرابط بـ https:// أو http://', en: 'URL must start with http(s)://' },
  BILINGUAL_MISSING: {
    ar: 'أضف الترجمة الإنجليزية لتحسين الظهور دوليًا',
    en: 'Add the Arabic translation to improve local visibility',
  },
  COORDS_MISSING: {
    ar: 'موقع المنشأة لم يُحدّد بعد. الخطوات: 1) افتح قسم «الموقع» 2) اضغط على الخريطة لتثبيت الدبوس أو استخدم «موقعي الحالي» 3) (اختياري) اضغط «تعبئة العنوان» لتعبئة المنطقة والحي تلقائيًا.',
    en: 'Business location is not set. Steps: 1) Open the Location section 2) Click the map to drop a pin or use “My location” 3) (Optional) click “Auto-fill address” to populate region & district.',
  },
  COORDS_INVALID: {
    ar: 'الإحداثيات غير صحيحة. تأكد أن خط العرض بين -90 و 90 وخط الطول بين -180 و 180. الحل الأسرع: أعد اختيار النقطة من الخريطة لتُعبَّأ الحقول تلقائيًا.',
    en: 'Coordinates are invalid. Latitude must be between -90 and 90, longitude between -180 and 180. Quickest fix: pick the point again on the map to refill the fields automatically.',
  },
};

export const messageFor = (code: ValidationCode, isRTL: boolean) =>
  isRTL ? messages[code].ar : messages[code].en;

interface ValidatableForm {
  name_ar?: string | null;
  name_en?: string | null;
  national_id?: string | null;
  unified_number?: string | null;
  vat_number?: string | null;
  phone?: string | null;
  mobile?: string | null;
  customer_service_phone?: string | null;
  email?: string | null;
  website?: string | null;
  account_manager_email?: string | null;
  account_manager_phone?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  short_description_ar?: string | null;
  short_description_en?: string | null;
  region?: string | null;
  region_en?: string | null;
  address?: string | null;
  address_en?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

const checkField = (
  schema: z.ZodTypeAny,
  key: ValidationKey,
  value: string | null | undefined,
  issues: ValidationIssue[],
) => {
  const result = schema.safeParse(value ?? '');
  if (!result.success) {
    const code = (result.error.issues[0]?.message ?? 'REQUIRED') as ValidationCode;
    issues.push({ key, code, severity: 'error' });
  }
};

const checkBilingual = (
  ar: string | null | undefined,
  en: string | null | undefined,
  key: ValidationKey,
  issues: ValidationIssue[],
) => {
  const hasAr = !!ar?.trim();
  const hasEn = !!en?.trim();
  if (hasAr !== hasEn && (hasAr || hasEn)) {
    issues.push({ key, code: 'BILINGUAL_MISSING', severity: 'warning' });
  }
};

export function validateBusinessForm(form: ValidatableForm): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!form.name_ar?.trim()) {
    // Soft requirement: the business name is needed before publishing, but we
    // still allow saving partial drafts so the user never loses progress.
    issues.push({ key: 'name_ar', code: 'REQUIRED', severity: 'warning' });
  }

  checkField(vatSchema, 'vat_number', form.vat_number, issues);
  checkField(crSchema, 'national_id', form.national_id, issues);
  checkField(unifiedSchema, 'unified_number', form.unified_number, issues);

  checkField(phoneSchema, 'phone', form.phone, issues);
  checkField(phoneSchema, 'mobile', form.mobile, issues);
  checkField(phoneSchema, 'customer_service_phone', form.customer_service_phone, issues);
  checkField(phoneSchema, 'account_manager_phone', form.account_manager_phone, issues);

  checkField(emailSchema, 'email', form.email, issues);
  checkField(emailSchema, 'account_manager_email', form.account_manager_email, issues);
  checkField(urlSchema, 'website', form.website, issues);

  checkBilingual(form.name_ar, form.name_en, 'name_en', issues);
  checkBilingual(form.short_description_ar, form.short_description_en, 'short_description_ar_en', issues);
  checkBilingual(form.description_ar, form.description_en, 'description_ar_en', issues);
  checkBilingual(form.region, form.region_en, 'region_ar_en', issues);
  checkBilingual(form.address, form.address_en, 'address_ar_en', issues);

  // Coordinates: required + range validation
  if (form.latitude == null || form.longitude == null) {
    // Treat missing coordinates as a publish-time warning so users can save
    // other edits before pinning the map.
    issues.push({ key: 'coordinates', code: 'COORDS_MISSING', severity: 'warning' });
  } else if (
    form.latitude < -90 || form.latitude > 90 ||
    form.longitude < -180 || form.longitude > 180
  ) {
    issues.push({ key: 'coordinates', code: 'COORDS_INVALID', severity: 'error' });
  }

  return issues;
}

export const issuesByKey = (issues: ValidationIssue[]) =>
  issues.reduce<Record<string, ValidationIssue>>((acc, i) => {
    if (!acc[i.key] || (acc[i.key].severity === 'warning' && i.severity === 'error')) acc[i.key] = i;
    return acc;
  }, {});

export const errorCount = (issues: ValidationIssue[]) =>
  issues.filter((i) => i.severity === 'error').length;

export const warningCount = (issues: ValidationIssue[]) =>
  issues.filter((i) => i.severity === 'warning').length;