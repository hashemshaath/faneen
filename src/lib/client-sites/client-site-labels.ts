/**
 * Shared bilingual labels and constants for the Client Sites system.
 *
 * Centralizes section keys, visibility levels, access levels, and grant
 * statuses that are otherwise duplicated across:
 *  - ClientSiteVisibilitySettingsCard
 *  - ClientSiteAccessRequestsPanel
 *  - PublicSiteScan
 *  - ClientSiteQrCard
 *
 * Pure presentational data only. No RPC logic lives here.
 */

export type SiteVisibility = 'private' | 'shared_by_qr' | 'public_limited';

export type SectionVisibilityLevel =
  | 'hidden'
  | 'public_limited'
  | 'visible_after_request'
  | 'visible_after_approval'
  | 'visible_to_approved_provider'
  | 'admin_only';

export type AccessLevel = 'limited' | 'quote' | 'service' | 'contract' | 'admin';

export type GrantStatus = 'requested' | 'approved' | 'rejected' | 'revoked' | 'ignored';

export interface BiLabel { ar: string; en: string }

export interface SectionDef extends BiLabel {
  key: string;
  sensitive?: boolean;
}

/** All owner-managed visibility sections (used by owner settings card). */
export const SITE_SECTIONS: ReadonlyArray<SectionDef> = [
  { key: 'basic_summary', ar: 'الملخص الأساسي', en: 'Basic summary' },
  { key: 'site_ref', ar: 'معرف الموقع', en: 'Site reference' },
  { key: 'site_type', ar: 'نوع الموقع', en: 'Site type' },
  { key: 'city', ar: 'المدينة', en: 'City' },
  { key: 'district', ar: 'الحي', en: 'District' },
  { key: 'full_address', ar: 'العنوان الكامل', en: 'Full address', sensitive: true },
  { key: 'map_location', ar: 'الموقع على الخريطة', en: 'Map location', sensitive: true },
  { key: 'contact_person', ar: 'جهة الاتصال', en: 'Contact person', sensitive: true },
  { key: 'contact_phone', ar: 'هاتف التواصل', en: 'Contact phone', sensitive: true },
  { key: 'project_description', ar: 'وصف المشروع', en: 'Project description' },
  { key: 'required_services', ar: 'الخدمات المطلوبة', en: 'Required services' },
  { key: 'specifications', ar: 'المواصفات', en: 'Specifications' },
  { key: 'measurements', ar: 'القياسات', en: 'Measurements' },
  { key: 'photos', ar: 'الصور', en: 'Photos' },
  { key: 'attachments', ar: 'المرفقات', en: 'Attachments', sensitive: true },
  { key: 'budget_range', ar: 'نطاق الميزانية', en: 'Budget range' },
  { key: 'preferred_timeline', ar: 'الجدول الزمني', en: 'Preferred timeline' },
  { key: 'contracts', ar: 'العقود', en: 'Contracts', sensitive: true },
  { key: 'previous_visits', ar: 'الزيارات السابقة', en: 'Previous visits', sensitive: true },
  { key: 'notes', ar: 'ملاحظات', en: 'Notes', sensitive: true },
];

/** Subset shown on the public /s/:token scan page as locked previews. */
export const PUBLIC_LOCKED_SECTION_KEYS: ReadonlyArray<string> = [
  'project_description',
  'required_services',
  'specifications',
  'measurements',
  'photos',
  'full_address',
  'map_location',
  'contact_person',
  'contact_phone',
];

export const SECTION_VISIBILITY_LEVELS: ReadonlyArray<{ v: SectionVisibilityLevel } & BiLabel> = [
  { v: 'hidden', ar: 'مخفي', en: 'Hidden' },
  { v: 'public_limited', ar: 'عام محدود', en: 'Public (limited)' },
  { v: 'visible_after_request', ar: 'بعد الطلب', en: 'After request' },
  { v: 'visible_after_approval', ar: 'بعد الموافقة', en: 'After approval' },
  { v: 'visible_to_approved_provider', ar: 'لمزود معتمد', en: 'Approved provider only' },
  { v: 'admin_only', ar: 'للإدارة فقط', en: 'Admin only' },
];

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, BiLabel> = {
  limited: { ar: 'محدود', en: 'Limited' },
  quote: { ar: 'تسعير', en: 'Quote' },
  service: { ar: 'تنفيذ', en: 'Service' },
  contract: { ar: 'عقد', en: 'Contract' },
  admin: { ar: 'إدارة', en: 'Admin' },
};

export const ACCESS_LEVELS_ORDER: ReadonlyArray<AccessLevel> = [
  'limited', 'quote', 'service', 'contract', 'admin',
];

export const GRANT_STATUS_VARIANT: Record<GrantStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  requested: 'default',
  approved: 'secondary',
  rejected: 'destructive',
  revoked: 'outline',
  ignored: 'outline',
};

export const SITE_VISIBILITY_LABELS: Record<SiteVisibility, BiLabel> = {
  private: { ar: 'خاص', en: 'Private' },
  shared_by_qr: { ar: 'مشاركة عبر QR', en: 'Shared by QR' },
  public_limited: { ar: 'عرض محدود', en: 'Public limited' },
};

/** Pick a bilingual label given a locale flag. */
export const pickLabel = (l: BiLabel, isRTL: boolean): string => (isRTL ? l.ar : l.en);

/** Map RPC error messages to a friendly bilingual hint for visibility updates. */
export function visibilityErrorMessage(rawMsg: string, isRTL: boolean): string {
  if (/sensitive_chk|public_limited/i.test(rawMsg)) {
    return isRTL ? 'لا يمكن جعل هذا القسم عاماً' : 'This section cannot be made public';
  }
  return rawMsg;
}