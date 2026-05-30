import type {
  BrandStatus, BrandVerificationStatus,
  ProviderBrandRelationship, ProviderBrandAuthorizationStatus,
  BrandRequestType, BrandRequestStatus,
} from '../types';

type Locale = 'ar' | 'en';

export const brandStatusLabel: Record<BrandStatus, { ar: string; en: string }> = {
  draft:      { ar: 'مسودة', en: 'Draft' },
  pending:    { ar: 'قيد الانتظار', en: 'Pending' },
  in_review:  { ar: 'قيد المراجعة', en: 'In Review' },
  approved:   { ar: 'معتمدة', en: 'Approved' },
  rejected:   { ar: 'مرفوضة', en: 'Rejected' },
  archived:   { ar: 'مؤرشفة', en: 'Archived' },
  merged:     { ar: 'مدمجة', en: 'Merged' },
};

export const verificationLabel: Record<BrandVerificationStatus, { ar: string; en: string }> = {
  unverified: { ar: 'غير موثقة', en: 'Unverified' },
  claimed:    { ar: 'مطالب بها', en: 'Claimed' },
  verified:   { ar: 'موثقة', en: 'Verified' },
  official:   { ar: 'رسمية', en: 'Official' },
};

export const relationshipLabel: Record<ProviderBrandRelationship, { ar: string; en: string }> = {
  manufacturer:           { ar: 'مُصنِّع', en: 'Manufacturer' },
  official_agent:         { ar: 'وكيل رسمي', en: 'Official Agent' },
  authorized_distributor: { ar: 'موزع معتمد', en: 'Authorized Distributor' },
  distributor:            { ar: 'موزع', en: 'Distributor' },
  reseller:               { ar: 'مورد', en: 'Reseller' },
  importer:               { ar: 'مستورد', en: 'Importer' },
  installer:              { ar: 'مُركِّب', en: 'Installer' },
  fabricator:             { ar: 'مُصنِّع محلي', en: 'Fabricator' },
  maintenance_provider:   { ar: 'مزود صيانة', en: 'Maintenance Provider' },
  showroom:               { ar: 'صالة عرض', en: 'Showroom' },
  supplier:               { ar: 'مورِّد', en: 'Supplier' },
  other:                  { ar: 'أخرى', en: 'Other' },
};

export const authStatusLabel: Record<ProviderBrandAuthorizationStatus, { ar: string; en: string }> = {
  unverified: { ar: 'غير موثق', en: 'Unverified' },
  pending:    { ar: 'قيد المراجعة', en: 'Pending' },
  verified:   { ar: 'موثق', en: 'Verified' },
  rejected:   { ar: 'مرفوض', en: 'Rejected' },
  expired:    { ar: 'منتهي', en: 'Expired' },
};

export const requestTypeLabel: Record<BrandRequestType, { ar: string; en: string }> = {
  create_brand:     { ar: 'إضافة علامة جديدة', en: 'Create Brand' },
  claim_brand:      { ar: 'المطالبة بعلامة', en: 'Claim Brand' },
  link_provider:    { ar: 'ربط مزود بعلامة', en: 'Link Provider' },
  update_brand:     { ar: 'تعديل علامة', en: 'Update Brand' },
  report_duplicate: { ar: 'تكرار مشتبه', en: 'Report Duplicate' },
};

export const requestStatusLabel: Record<BrandRequestStatus, { ar: string; en: string }> = {
  pending:          { ar: 'قيد الانتظار', en: 'Pending' },
  in_review:        { ar: 'قيد المراجعة', en: 'In Review' },
  approved:         { ar: 'معتمد', en: 'Approved' },
  rejected:         { ar: 'مرفوض', en: 'Rejected' },
  needs_more_info:  { ar: 'يحتاج معلومات إضافية', en: 'Needs More Info' },
};

export function pick<T extends { ar: string; en: string }>(m: T, locale: Locale) {
  return locale === 'ar' ? m.ar : m.en;
}

/** Normalize an Arabic brand name for duplicate detection. */
export function normalizeArabicBrandName(value: string): string {
  return value
    .trim()
    .replace(/^(شركة|مصنع|مؤسسة|مجموعة)\s+/i, '')
    .replace(/\s+(للتجارة|للصناعة|للمقاولات|التجارية|الصناعية)$/i, '')
    .replace(/\s+(ألمنيوم|زجاج|حديد|أخشاب|دهانات)$/i, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function normalizeEnglishBrandName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b(co|ltd|inc|llc|gmbh|s\.a|s\.p\.a)\.?\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function generateBrandSlugCandidate(name_en: string | null, name_ar: string): string {
  const src = name_en && name_en.trim() ? name_en : name_ar;
  return src
    .trim()
    .toLowerCase()
    .replace(/[إأآا]/g, 'ا')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-\u0600-\u06FF]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}
