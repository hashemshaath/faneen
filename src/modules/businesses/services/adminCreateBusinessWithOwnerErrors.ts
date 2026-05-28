/**
 * Localized error mapper for the `admin-create-business-with-owner` edge function.
 *
 * The edge function returns short stable string codes in the `error` field.
 * The UI must never echo raw server text to the user — always pass through
 * this mapper to get a friendly Arabic / English message.
 *
 * Audit behavior note: the edge function writes to `admin_activity_log`
 * **best-effort** after the business is committed. If the audit insert fails
 * we deliberately do NOT roll back the business — losing an audit row is
 * preferable to losing a real entity that admins can already see in the UI.
 * This is enforced by the `best-effort audit` test in the regression suite.
 */
export type AdminCreateBizErrorCode =
  | 'invalid_owner_email'
  | 'password_too_short'
  | 'username_taken'
  | 'owner_email_taken'
  | 'owner_cannot_be_super_admin'
  | 'forbidden_admin_only'
  | 'missing_auth'
  | 'unauthorized'
  | 'invalid_body'
  | 'invalid_username'
  | 'name_ar_required'
  | 'owner_not_found'
  | 'owner_id_or_ref_required'
  | 'invalid_owner_mode'
  | 'owner_resolution_failed'
  | 'business_insert_failed'
  | 'profile_sync_failed'
  | 'auth_user_create_failed'
  | 'auth_create_failed'
  | 'unknown';

const MAP_AR: Record<AdminCreateBizErrorCode, string> = {
  invalid_owner_email: 'بريد المسؤول غير صالح. تأكد من صحة الصياغة.',
  password_too_short: 'كلمة المرور يجب ألا تقل عن 8 أحرف.',
  username_taken: 'اسم المستخدم محجوز لمنشأة أخرى. اختر اسماً مختلفاً.',
  owner_email_taken: 'البريد مسجل لحساب آخر. استخدم وضع "مستخدم موجود" أو بريداً مختلفاً.',
  owner_cannot_be_super_admin: 'لا يمكن تعيين حساب سوبر أدمن كمالك لمنشأة.',
  forbidden_admin_only: 'هذه العملية محصورة على المشرفين.',
  missing_auth: 'الجلسة منتهية. يرجى تسجيل الدخول مجدداً.',
  unauthorized: 'الجلسة غير صالحة. يرجى تسجيل الدخول مجدداً.',
  invalid_body: 'البيانات المرسلة غير مكتملة.',
  invalid_username: 'اسم المستخدم غير صالح (يجب ٣ أحرف على الأقل، إنجليزية وأرقام).',
  name_ar_required: 'الاسم بالعربية حقل إلزامي.',
  owner_not_found: 'تعذّر العثور على المستخدم المرجعي.',
  owner_id_or_ref_required: 'يجب تحديد معرّف المالك أو رقمه المرجعي.',
  invalid_owner_mode: 'نمط ربط المالك غير صحيح.',
  owner_resolution_failed: 'تعذّر تحديد مالك المنشأة. حاول مجدداً.',
  business_insert_failed: 'تعذّر حفظ بيانات المنشأة. تم التراجع عن الحساب المُنشأ.',
  profile_sync_failed: 'تم إنشاء الحساب لكن تعذّر تحديث ملفه الشخصي.',
  auth_user_create_failed: 'تعذّر إنشاء حساب الدخول للمسؤول.',
  auth_create_failed: 'تعذّر إنشاء حساب الدخول للمسؤول.',
  unknown: 'حدث خطأ غير متوقع. حاول مجدداً.',
};

const MAP_EN: Record<AdminCreateBizErrorCode, string> = {
  invalid_owner_email: 'Manager email is invalid. Check the format.',
  password_too_short: 'Password must be at least 8 characters.',
  username_taken: 'This username is already in use by another business.',
  owner_email_taken: 'Email is registered to another account. Use "Existing user" mode or a different email.',
  owner_cannot_be_super_admin: 'A super-admin account cannot own a business.',
  forbidden_admin_only: 'This action is restricted to administrators.',
  missing_auth: 'Session expired. Please sign in again.',
  unauthorized: 'Invalid session. Please sign in again.',
  invalid_body: 'Submitted data is incomplete.',
  invalid_username: 'Username is invalid (min 3 chars, lowercase letters / digits).',
  name_ar_required: 'Arabic name is required.',
  owner_not_found: 'Referenced user was not found.',
  owner_id_or_ref_required: 'Owner user id or reference id is required.',
  invalid_owner_mode: 'Invalid owner binding mode.',
  owner_resolution_failed: 'Could not resolve the business owner. Please retry.',
  business_insert_failed: 'Could not save the business. The created auth account was rolled back.',
  profile_sync_failed: 'Account was created but the profile sync failed.',
  auth_user_create_failed: "Could not create the manager's login account.",
  auth_create_failed: "Could not create the manager's login account.",
  unknown: 'Something went wrong. Please try again.',
};

const KNOWN_CODES = new Set<string>(Object.keys(MAP_EN));

export function isKnownAdminCreateBizErrorCode(
  code: string | undefined | null,
): code is AdminCreateBizErrorCode {
  return !!code && KNOWN_CODES.has(code);
}

/**
 * Translate an edge-function error string into a friendly localized message.
 * Falls back to the `unknown` bucket for any unrecognized code — we never
 * surface the raw server string to end users.
 */
export function mapAdminCreateBizError(
  rawError: string | undefined | null,
  locale: 'ar' | 'en',
): string {
  const table = locale === 'ar' ? MAP_AR : MAP_EN;
  const code = (rawError ?? '').trim();
  if (isKnownAdminCreateBizErrorCode(code)) return table[code];
  return table.unknown;
}
