/**
 * Centralized human-readable labels for notification/audit/cron keys.
 *
 * Goal: never surface raw technical identifiers like
 *   `username_status_changed`, `business_sensitive_update`,
 *   `membership_tier.admin_override`, `membership-payment-reconcile-hourly`
 * to end users. Always render an Arabic (or English) sentence.
 *
 * Use:
 *   getNotificationLabel('business_updated', 'ar')
 *     // → 'تحديث بيانات المنشأة'
 *   resolveNotificationTitle({ title_ar, title_en, notification_type }, 'ar')
 *     // → falls back to the dictionary when the title is missing or
 *     //   equals the raw type key.
 *   humanizeKey('membership-payment-reconcile-hourly', 'en')
 *     // → 'Membership Payment Reconcile Hourly'
 */

export type Lang = 'ar' | 'en';

interface LabelPair {
  ar: string;
  en: string;
}

/** Curated dictionary — extend as new notification/audit keys appear. */
export const notificationLabelDict: Record<string, LabelPair> = {
  // ── Identity / username
  username_status_changed:       { ar: 'تغيير حالة اسم المستخدم', en: 'Username Status Changed' },
  username_changed:              { ar: 'تغيير اسم المستخدم',       en: 'Username Changed' },
  username_approved:             { ar: 'اعتماد اسم المستخدم',      en: 'Username Approved' },
  username_rejected:             { ar: 'رفض اسم المستخدم',         en: 'Username Rejected' },
  email_changed:                 { ar: 'تغيير البريد الإلكتروني', en: 'Email Changed' },
  email_verified:                { ar: 'تأكيد البريد الإلكتروني', en: 'Email Verified' },
  phone_changed:                 { ar: 'تغيير رقم الجوال',         en: 'Phone Changed' },

  // ── Business / profile updates
  business_created:              { ar: 'إنشاء منشأة جديدة',        en: 'Business Created' },
  business_updated:              { ar: 'تحديث بيانات المنشأة',     en: 'Business Updated' },
  business_sensitive_update:     { ar: 'تحديث بيانات حسّاسة للمنشأة', en: 'Sensitive Business Update' },
  business_verified:             { ar: 'توثيق المنشأة',             en: 'Business Verified' },
  business_visibility_changed:   { ar: 'تغيير ظهور المنشأة',        en: 'Business Visibility Changed' },
  business_owner_changed:        { ar: 'تغيير مالك المنشأة',        en: 'Business Owner Changed' },

  // ── Memberships
  membership_created:                  { ar: 'تفعيل العضوية',                en: 'Membership Activated' },
  membership_renewed:                  { ar: 'تجديد العضوية',                en: 'Membership Renewed' },
  membership_expired:                  { ar: 'انتهاء العضوية',               en: 'Membership Expired' },
  membership_suspended:                { ar: 'تعليق العضوية',                en: 'Membership Suspended' },
  membership_tier_changed:             { ar: 'تغيير باقة العضوية',           en: 'Membership Tier Changed' },
  'membership_tier.admin_override':    { ar: 'تعديل الباقة من قِبل الإدارة',  en: 'Tier Overridden by Admin' },
  membership_payment_reconcile:        { ar: 'مطابقة دفعات العضوية',         en: 'Membership Payment Reconcile' },
  'membership-payment-reconcile':      { ar: 'مطابقة دفعات العضوية',         en: 'Membership Payment Reconcile' },
  'membership-payment-reconcile-hourly': { ar: 'مطابقة دفعات العضوية (كل ساعة)', en: 'Membership Payment Reconcile (Hourly)' },
  membership_payment_succeeded:        { ar: 'نجاح دفعة العضوية',            en: 'Membership Payment Succeeded' },
  membership_payment_failed:           { ar: 'فشل دفعة العضوية',             en: 'Membership Payment Failed' },
  membership_payment_refunded:         { ar: 'استرداد دفعة العضوية',         en: 'Membership Payment Refunded' },
  provider_credit_granted:             { ar: 'منح رصيد للمزوّد',             en: 'Provider Credit Granted' },
  provider_credit_consumed:            { ar: 'استهلاك رصيد المزوّد',          en: 'Provider Credit Consumed' },
  membership_payment_marked_paid:      { ar: 'تأكيد دفعة العضوية يدويًا',     en: 'Membership Payment Marked Paid' },
  membership_payment_marked_refunded:  { ar: 'استرداد دفعة العضوية يدويًا',   en: 'Membership Payment Marked Refunded' },
  'membership-lifecycle-dispatcher':    { ar: 'موزّع دورة حياة العضويات',     en: 'Membership Lifecycle Dispatcher' },
  'monthly-provider-credit-grant':      { ar: 'منح الرصيد الشهري للمزوّدين',  en: 'Monthly Provider Credit Grant' },

  // ── Roles / staff / access
  user_added:                    { ar: 'إضافة مستخدم',              en: 'User Added' },
  user_removed:                  { ar: 'إزالة مستخدم',              en: 'User Removed' },
  role_changed:                  { ar: 'تغيير الصلاحية',            en: 'Role Changed' },
  role_granted:                  { ar: 'منح صلاحية',                en: 'Role Granted' },
  role_revoked:                  { ar: 'سحب صلاحية',                en: 'Role Revoked' },
  owner_changed:                 { ar: 'تغيير المالك',              en: 'Owner Changed' },
  primary_manager_changed:       { ar: 'تغيير المدير الرئيسي',      en: 'Primary Manager Changed' },
  invitation_sent:               { ar: 'إرسال دعوة',                en: 'Invitation Sent' },
  invitation_accepted:           { ar: 'قبول دعوة',                 en: 'Invitation Accepted' },
  invitation_declined:           { ar: 'رفض دعوة',                  en: 'Invitation Declined' },

  // ── Contracts / projects / payments (already covered in notification-types, but
  //    also referenced from audit logs by these snake_case keys).
  contract_created:              { ar: 'إنشاء عقد',                 en: 'Contract Created' },
  contract_updated:              { ar: 'تحديث عقد',                 en: 'Contract Updated' },
  contract_signed:               { ar: 'توقيع عقد',                 en: 'Contract Signed' },
  contract_awaiting:             { ar: 'عقد ينتظر التوقيع',         en: 'Contract Awaiting Signature' },
  contract_cancelled:            { ar: 'إلغاء عقد',                 en: 'Contract Cancelled' },
  payment_due:                   { ar: 'دفعة مستحقة',               en: 'Payment Due' },
  payment_received:              { ar: 'استلام دفعة',               en: 'Payment Received' },
  stage_completed:               { ar: 'اكتمال مرحلة',              en: 'Stage Completed' },
  stage_awaiting:                { ar: 'مرحلة بانتظار تأكيد',       en: 'Stage Awaiting Confirmation' },
  contract_milestone_completed:  { ar: 'اكتمال مرحلة من العقد',     en: 'Contract Milestone Completed' },
  contract_payment_recorded:     { ar: 'تسجيل دفعة عقد',            en: 'Contract Payment Recorded' },

  // ── Reviews / quotes / messages
  new_message:                   { ar: 'رسالة جديدة',               en: 'New Message' },
  new_review:                    { ar: 'تقييم جديد',                en: 'New Review' },
  review_replied:                { ar: 'رد على التقييم',            en: 'Review Reply' },
  quote_received:                { ar: 'استلام عرض سعر',            en: 'Quote Received' },
  quote_accepted:                { ar: 'قبول عرض السعر',            en: 'Quote Accepted' },
  quote_rejected:                { ar: 'رفض عرض السعر',             en: 'Quote Rejected' },
  quote_request_submitted:       { ar: 'إرسال طلب عرض سعر',         en: 'Quote Request Submitted' },
  quote_request_new_admin:       { ar: 'طلب عرض سعر جديد (إدارة)',   en: 'New Quote Request (Admin)' },
  quote_request_status_updated:  { ar: 'تحديث حالة طلب عرض السعر',  en: 'Quote Request Status Updated' },
  quote_lead_assigned:           { ar: 'إسناد فرصة بيع',            en: 'Lead Assigned' },
  quote_contact_revealed:        { ar: 'كشف بيانات التواصل',         en: 'Contact Details Revealed' },
  lead_cancelled:                { ar: 'إلغاء الفرصة',              en: 'Lead Cancelled' },

  // ── Brands / staff invitations
  brand_request_approved:        { ar: 'اعتماد طلب علامة تجارية',   en: 'Brand Request Approved' },
  brand_request_rejected:        { ar: 'رفض طلب علامة تجارية',      en: 'Brand Request Rejected' },
  provider_brand_link_approved:  { ar: 'اعتماد ربط العلامة بالمزوّد', en: 'Provider Brand Link Approved' },
  provider_brand_link_rejected:  { ar: 'رفض ربط العلامة بالمزوّد',    en: 'Provider Brand Link Rejected' },
  business_staff_invitation:     { ar: 'دعوة موظف للمنشأة',         en: 'Business Staff Invitation' },

  // ── Maintenance / warranty
  maintenance_request:           { ar: 'طلب صيانة',                 en: 'Maintenance Request' },
  maintenance_update:            { ar: 'تحديث صيانة',               en: 'Maintenance Update' },
  warranty_expiring:             { ar: 'ضمان قارب على الانتهاء',    en: 'Warranty Expiring' },

  // ── Cron / system jobs
  cron_run:                      { ar: 'تشغيل مهمة مجدولة',         en: 'Cron Run' },
  daily_digest:                  { ar: 'الملخص اليومي',             en: 'Daily Digest' },
  hourly_digest:                 { ar: 'الملخص الساعي',             en: 'Hourly Digest' },

  // ── Generic entity types (audit log entity_type column)
  business:                      { ar: 'منشأة',                     en: 'Business' },
  user_role:                     { ar: 'صلاحية مستخدم',             en: 'User Role' },
  membership:                    { ar: 'عضوية',                     en: 'Membership' },
  staff_invitation:              { ar: 'دعوة موظف',                 en: 'Staff Invitation' },
  business_member:               { ar: 'عضو منشأة',                 en: 'Business Member' },
  contract:                      { ar: 'عقد',                       en: 'Contract' },
  project:                       { ar: 'مشروع',                     en: 'Project' },
  payment:                       { ar: 'دفعة',                      en: 'Payment' },
  review:                        { ar: 'تقييم',                     en: 'Review' },
  notification:                  { ar: 'إشعار',                     en: 'Notification' },
  system:                        { ar: 'النظام',                    en: 'System' },
  security:                      { ar: 'الأمان',                    en: 'Security' },
};

/** Convert snake_case / kebab-case / dot.case keys to Title Case words. */
export function humanizeKey(key: string | null | undefined, lang: Lang = 'en'): string {
  if (!key) return lang === 'ar' ? 'حدث' : 'Event';
  const cleaned = key
    .replace(/[._-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
  if (lang === 'ar') {
    // No reliable English→Arabic transliteration; show the cleaned key in mono.
    return cleaned;
  }
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Dictionary lookup with humanized fallback. */
export function getNotificationLabel(
  key: string | null | undefined,
  lang: Lang = 'ar',
): string {
  if (!key) return lang === 'ar' ? 'حدث' : 'Event';
  const direct = notificationLabelDict[key];
  if (direct) return lang === 'ar' ? direct.ar : direct.en;
  // Normalize separators and retry (covers `membership-payment-reconcile` vs `_`).
  const normalized = key.replace(/-/g, '_').toLowerCase();
  const norm = notificationLabelDict[normalized];
  if (norm) return lang === 'ar' ? norm.ar : norm.en;
  return humanizeKey(key, lang);
}

/** Cron job display label — keeps the technical name visible but adds a
 *  localized title when known. */
export function humanizeJobName(
  jobName: string | null | undefined,
  lang: Lang = 'ar',
): string {
  return getNotificationLabel(jobName, lang);
}

/** Detect if a stored notification title is actually just the raw type key. */
function looksLikeRawKey(s: string): boolean {
  if (!s) return true;
  // No spaces, contains an underscore/dash/dot, and is short-ish.
  return /^[a-z0-9][a-z0-9._-]*$/i.test(s) && /[._-]/.test(s);
}

/**
 * Pick the best title to render for a notification row.
 * Falls back to the dictionary when the stored `title_ar/title_en` is
 * empty or is just the raw type key (which has happened with some
 * system-emitted notifications).
 */
export function resolveNotificationTitle(
  n: {
    title_ar?: string | null;
    title_en?: string | null;
    notification_type?: string | null;
    reference_type?: string | null;
  },
  lang: Lang = 'ar',
): string {
  const stored = lang === 'ar'
    ? (n.title_ar || n.title_en || '')
    : (n.title_en || n.title_ar || '');
  if (stored && !looksLikeRawKey(stored)) return stored;
  return getNotificationLabel(n.notification_type || n.reference_type, lang);
}