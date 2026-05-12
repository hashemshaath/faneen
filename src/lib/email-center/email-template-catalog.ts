/**
 * Static catalog of all Qitaat email templates (transactional + auth).
 * Used by the admin Email Operations Center for documentation, preview
 * metadata, and category filtering. Server-side template registry lives in
 * supabase/functions/_shared/transactional-email-templates/registry.ts.
 */

export type EmailCategory =
  | 'auth'
  | 'registration'
  | 'provider_lifecycle'
  | 'lead'
  | 'contract'
  | 'contact'
  | 'payment'
  | 'maintenance'
  | 'admin_system'
  | 'membership';

export type EmailRecipientType =
  | 'user'
  | 'provider'
  | 'admin'
  | 'client'
  | 'system';

export interface EmailTemplateMeta {
  /** Slug as registered in TEMPLATES map or auth hook EMAIL_TEMPLATES */
  name: string;
  /** Human display name (Arabic) */
  displayNameAr: string;
  displayNameEn: string;
  category: EmailCategory;
  recipient: EmailRecipientType;
  /** Where the template is invoked from */
  trigger: string;
  descriptionAr: string;
  descriptionEn: string;
  /** Active = wired in product; Inactive = scaffolded but not yet triggered */
  active: boolean;
  /** Variables the template expects */
  variables: string[];
  /** 'transactional' uses send-transactional-email, 'auth' uses auth-email-hook */
  kind: 'transactional' | 'auth';
}

export const CATEGORY_LABELS: Record<EmailCategory, { ar: string; en: string }> = {
  auth: { ar: 'المصادقة', en: 'Auth' },
  registration: { ar: 'التسجيل', en: 'Registration' },
  provider_lifecycle: { ar: 'دورة حياة المزود', en: 'Provider Lifecycle' },
  lead: { ar: 'الطلبات (Leads)', en: 'Leads' },
  contract: { ar: 'العقود', en: 'Contracts' },
  contact: { ar: 'التواصل', en: 'Contact' },
  payment: { ar: 'المدفوعات', en: 'Payments' },
  maintenance: { ar: 'الصيانة والحالة', en: 'Maintenance & Status' },
  admin_system: { ar: 'إداري/نظامي', en: 'Admin / System' },
  membership: { ar: 'العضوية', en: 'Membership' },
};

export const RECIPIENT_LABELS: Record<EmailRecipientType, { ar: string; en: string }> = {
  user: { ar: 'المستخدم', en: 'User' },
  provider: { ar: 'المزود', en: 'Provider' },
  admin: { ar: 'المشرف', en: 'Admin' },
  client: { ar: 'العميل', en: 'Client' },
  system: { ar: 'نظام', en: 'System' },
};

export const EMAIL_TEMPLATE_CATALOG: EmailTemplateMeta[] = [
  // ── Auth ────────────────────────────────────────────────
  { name: 'signup', displayNameAr: 'تأكيد التسجيل', displayNameEn: 'Signup confirmation', category: 'auth', recipient: 'user', trigger: 'Supabase Auth — signUp', descriptionAr: 'رابط تأكيد البريد بعد إنشاء الحساب.', descriptionEn: 'Email confirmation link after signup.', active: true, variables: ['confirmationUrl', 'siteName'], kind: 'auth' },
  { name: 'invite', displayNameAr: 'دعوة للانضمام', displayNameEn: 'Invitation', category: 'auth', recipient: 'user', trigger: 'Supabase Auth — inviteUserByEmail', descriptionAr: 'دعوة مستخدم جديد للانضمام إلى قِطاعات.', descriptionEn: 'Invite a new user to join Qitaat.', active: true, variables: ['confirmationUrl', 'siteName'], kind: 'auth' },
  { name: 'magiclink', displayNameAr: 'رابط الدخول السحري', displayNameEn: 'Magic link', category: 'auth', recipient: 'user', trigger: 'Supabase Auth — signInWithOtp', descriptionAr: 'رابط تسجيل دخول بدون كلمة مرور.', descriptionEn: 'Passwordless sign-in link.', active: true, variables: ['confirmationUrl'], kind: 'auth' },
  { name: 'recovery', displayNameAr: 'إعادة تعيين كلمة المرور', displayNameEn: 'Password recovery', category: 'auth', recipient: 'user', trigger: 'Supabase Auth — resetPasswordForEmail', descriptionAr: 'رابط إعادة تعيين كلمة المرور.', descriptionEn: 'Password reset link.', active: true, variables: ['confirmationUrl'], kind: 'auth' },
  { name: 'email_change', displayNameAr: 'تأكيد تغيير البريد', displayNameEn: 'Email change', category: 'auth', recipient: 'user', trigger: 'Supabase Auth — updateUser email', descriptionAr: 'تأكيد تغيير عنوان البريد الإلكتروني.', descriptionEn: 'Confirm new email address.', active: true, variables: ['confirmationUrl', 'oldEmail', 'newEmail'], kind: 'auth' },
  { name: 'reauthentication', displayNameAr: 'رمز إعادة التحقق', displayNameEn: 'Reauthentication OTP', category: 'auth', recipient: 'user', trigger: 'Supabase Auth — reauthenticate', descriptionAr: 'رمز OTP لإعادة التحقق قبل عمليات حساسة.', descriptionEn: 'OTP for sensitive re-auth.', active: true, variables: ['token'], kind: 'auth' },

  // ── Registration / Welcome ──────────────────────────────
  { name: 'welcome-signup', displayNameAr: 'ترحيب بمستخدم جديد', displayNameEn: 'Welcome signup', category: 'registration', recipient: 'user', trigger: 'authService.ts after first signup', descriptionAr: 'بريد ترحيبي بعد التسجيل الناجح.', descriptionEn: 'Welcome email after successful signup.', active: true, variables: ['name'], kind: 'transactional' },
  { name: 'welcome-business', displayNameAr: 'ترحيب بمنشأة جديدة', displayNameEn: 'Welcome business', category: 'registration', recipient: 'provider', trigger: 'After business creation', descriptionAr: 'ترحيب وبدء رحلة المزود.', descriptionEn: 'Welcome and onboarding for new business.', active: true, variables: ['businessName'], kind: 'transactional' },

  // ── Contact ─────────────────────────────────────────────
  { name: 'contact-confirmation', displayNameAr: 'تأكيد رسالة التواصل', displayNameEn: 'Contact form confirmation', category: 'contact', recipient: 'user', trigger: 'Contact.tsx submit', descriptionAr: 'إشعار للمرسل بأن رسالته وصلت.', descriptionEn: 'Acknowledgement to the sender.', active: true, variables: ['name'], kind: 'transactional' },
  { name: 'contact-admin-notification', displayNameAr: 'إشعار إداري برسالة جديدة', displayNameEn: 'Admin contact notification', category: 'contact', recipient: 'admin', trigger: 'Contact.tsx submit', descriptionAr: 'إخطار المشرفين برسالة تواصل جديدة.', descriptionEn: 'Notify admins of a new contact message.', active: true, variables: ['name', 'email', 'subject', 'message'], kind: 'transactional' },

  // ── Leads ───────────────────────────────────────────────
  { name: 'lead-confirmation', displayNameAr: 'تأكيد طلب العميل', displayNameEn: 'Lead confirmation (client)', category: 'lead', recipient: 'client', trigger: 'AdminLeadRequests / Lead intake', descriptionAr: 'تأكيد استلام طلب العميل.', descriptionEn: 'Confirm client lead receipt.', active: true, variables: ['name', 'leadId'], kind: 'transactional' },
  { name: 'lead-notification', displayNameAr: 'إشعار طلب جديد للمزود', displayNameEn: 'Lead notification (provider)', category: 'lead', recipient: 'provider', trigger: 'AdminLeadRequests assign', descriptionAr: 'إخطار المزود بطلب جديد.', descriptionEn: 'Notify provider of a new lead.', active: true, variables: ['providerName', 'leadSummary'], kind: 'transactional' },
  { name: 'lead-accepted', displayNameAr: 'قبول الطلب', displayNameEn: 'Lead accepted', category: 'lead', recipient: 'client', trigger: 'Provider accepts lead', descriptionAr: 'إخطار العميل بقبول طلبه.', descriptionEn: 'Lead accepted notice.', active: true, variables: ['leadId'], kind: 'transactional' },
  { name: 'lead-rejected', displayNameAr: 'رفض الطلب', displayNameEn: 'Lead rejected', category: 'lead', recipient: 'client', trigger: 'Provider rejects lead', descriptionAr: 'إخطار برفض الطلب.', descriptionEn: 'Lead rejected notice.', active: true, variables: ['leadId', 'reason'], kind: 'transactional' },
  { name: 'lead-needs-info', displayNameAr: 'الطلب يحتاج معلومات', displayNameEn: 'Lead needs info', category: 'lead', recipient: 'client', trigger: 'Provider requests info', descriptionAr: 'طلب معلومات إضافية من العميل.', descriptionEn: 'Request additional info from client.', active: true, variables: ['leadId', 'questions'], kind: 'transactional' },
  { name: 'lead-quoted', displayNameAr: 'تم تقديم عرض سعر', displayNameEn: 'Lead quoted', category: 'lead', recipient: 'client', trigger: 'Provider sends quote', descriptionAr: 'إخطار بعرض السعر المقدم.', descriptionEn: 'Quote sent notification.', active: true, variables: ['leadId', 'amount'], kind: 'transactional' },
  { name: 'lead-cancelled-provider-notice', displayNameAr: 'إلغاء الطلب — إشعار المزود', displayNameEn: 'Lead cancelled (provider notice)', category: 'lead', recipient: 'provider', trigger: 'Client cancels lead', descriptionAr: 'إخطار المزود بإلغاء الطلب.', descriptionEn: 'Notify provider of cancellation.', active: true, variables: ['leadId'], kind: 'transactional' },

  // ── Provider lifecycle ─────────────────────────────────
  { name: 'provider-approved', displayNameAr: 'قبول المزود', displayNameEn: 'Provider approved', category: 'provider_lifecycle', recipient: 'provider', trigger: 'AdminProviderReview approve', descriptionAr: 'إخطار باعتماد المزود.', descriptionEn: 'Provider approval notice.', active: true, variables: ['businessName'], kind: 'transactional' },
  { name: 'provider-rejected', displayNameAr: 'رفض المزود', displayNameEn: 'Provider rejected', category: 'provider_lifecycle', recipient: 'provider', trigger: 'AdminProviderReview reject', descriptionAr: 'إخطار برفض الطلب مع السبب.', descriptionEn: 'Provider rejection notice.', active: true, variables: ['businessName', 'reason'], kind: 'transactional' },
  { name: 'provider-revision-requested', displayNameAr: 'طلب تعديل من المزود', displayNameEn: 'Provider revision requested', category: 'provider_lifecycle', recipient: 'provider', trigger: 'AdminProviderReview revise', descriptionAr: 'طلب تعديل بيانات المزود.', descriptionEn: 'Request provider to revise data.', active: true, variables: ['businessName', 'notes'], kind: 'transactional' },

  // ── Contracts ───────────────────────────────────────────
  { name: 'contract-draft-created-client', displayNameAr: 'مسودة عقد جديدة (عميل)', displayNameEn: 'Contract draft (client)', category: 'contract', recipient: 'client', trigger: 'ContractDetail create draft', descriptionAr: 'إخطار العميل بمسودة عقد جديدة.', descriptionEn: 'Notify client of new draft.', active: true, variables: ['contractId', 'providerName'], kind: 'transactional' },
  { name: 'contract-draft-created-provider', displayNameAr: 'مسودة عقد جديدة (مزود)', displayNameEn: 'Contract draft (provider)', category: 'contract', recipient: 'provider', trigger: 'ContractDetail create draft', descriptionAr: 'إخطار المزود بمسودة عقد جديدة.', descriptionEn: 'Notify provider of new draft.', active: true, variables: ['contractId', 'clientName'], kind: 'transactional' },
  { name: 'contract-signed', displayNameAr: 'توقيع العقد', displayNameEn: 'Contract signed', category: 'contract', recipient: 'client', trigger: 'Contract status → Active', descriptionAr: 'تأكيد توقيع العقد.', descriptionEn: 'Contract signed confirmation.', active: true, variables: ['contractId'], kind: 'transactional' },
  { name: 'contract-status-update', displayNameAr: 'تحديث حالة العقد', displayNameEn: 'Contract status update', category: 'contract', recipient: 'client', trigger: 'Contract status change', descriptionAr: 'تحديث على حالة العقد.', descriptionEn: 'Contract status change.', active: true, variables: ['contractId', 'status'], kind: 'transactional' },

  // ── Bookings / Maintenance / Payments ───────────────────
  { name: 'booking-confirmation', displayNameAr: 'تأكيد الحجز', displayNameEn: 'Booking confirmation', category: 'maintenance', recipient: 'client', trigger: 'BookingWidget confirm', descriptionAr: 'تأكيد حجز موعد.', descriptionEn: 'Booking confirmation.', active: true, variables: ['bookingId', 'date'], kind: 'transactional' },
  { name: 'maintenance-status-update', displayNameAr: 'تحديث حالة الصيانة', displayNameEn: 'Maintenance status', category: 'maintenance', recipient: 'client', trigger: 'Maintenance status change', descriptionAr: 'تحديث على حالة طلب الصيانة.', descriptionEn: 'Maintenance status change.', active: true, variables: ['ticketId', 'status'], kind: 'transactional' },
  { name: 'payment-reminder', displayNameAr: 'تذكير بالدفع', displayNameEn: 'Payment reminder', category: 'payment', recipient: 'client', trigger: 'Scheduled / overdue invoice', descriptionAr: 'تذكير بدفع مستحق.', descriptionEn: 'Payment due reminder.', active: true, variables: ['amount', 'dueDate'], kind: 'transactional' },
  { name: 'contract-payment-recorded', displayNameAr: 'تسجيل دفعة على العقد', displayNameEn: 'Contract payment recorded', category: 'contract', recipient: 'client', trigger: 'ContractDetail manual payment confirmation', descriptionAr: 'إخطار العميل بتسجيل دفعة على عقده.', descriptionEn: 'Notify client when a payment is recorded on their contract.', active: true, variables: ['contractId', 'contractRefId', 'installmentNumber', 'amount', 'currency'], kind: 'transactional' },
  { name: 'contract-payment-due', displayNameAr: 'تذكير بدفعة على العقد', displayNameEn: 'Contract payment due', category: 'contract', recipient: 'client', trigger: 'Future scheduled reminder (not yet automated)', descriptionAr: 'قالب لتذكير العميل بدفعة مستحقة على عقده. لم يتم تفعيل التذكير التلقائي بعد.', descriptionEn: 'Template to remind client of an upcoming payment. Automated reminders not enabled yet.', active: true, variables: ['contractId', 'contractRefId', 'installmentNumber', 'dueDate'], kind: 'transactional' },
  { name: 'contract-milestone-completed', displayNameAr: 'تحديث مرحلة العقد', displayNameEn: 'Contract milestone updated', category: 'contract', recipient: 'client', trigger: 'DashboardContracts milestone status → completed', descriptionAr: 'إخطار العميل عند تحديث مرحلة في العقد.', descriptionEn: 'Notify client when a contract milestone is updated.', active: true, variables: ['contractId', 'contractRefId', 'milestoneTitle'], kind: 'transactional' },

  // ── Contract amendments (C6.5) ──────────────────────────
  { name: 'contract-amendment-created', displayNameAr: 'ملحق — تم الإنشاء', displayNameEn: 'Amendment created', category: 'contract', recipient: 'client', trigger: 'ContractDetail submit amendment', descriptionAr: 'إخطار الطرف الآخر بإنشاء طلب ملحق.', descriptionEn: 'Notify counterparty of a new amendment request.', active: true, variables: ['contractRefId', 'amendmentNumber', 'amendmentTitle', 'amendmentType', 'publicReason', 'contractUrl'], kind: 'transactional' },
  { name: 'contract-amendment-pending-approval', displayNameAr: 'ملحق — بانتظار الموافقة', displayNameEn: 'Amendment pending approval', category: 'contract', recipient: 'client', trigger: 'Amendment awaiting party approval', descriptionAr: 'تذكير الطرف بأن موافقته مطلوبة على الملحق.', descriptionEn: 'Reminder that the party approval is needed.', active: true, variables: ['contractRefId', 'amendmentNumber', 'amendmentTitle', 'publicReason', 'contractUrl'], kind: 'transactional' },
  { name: 'contract-amendment-approved', displayNameAr: 'ملحق — تمت الموافقة', displayNameEn: 'Amendment approved', category: 'contract', recipient: 'client', trigger: 'approve_contract_amendment RPC', descriptionAr: 'إخطار الطرف الآخر بموافقة الطرف المقابل على الملحق.', descriptionEn: 'Notify the other party that an amendment was approved.', active: true, variables: ['contractRefId', 'amendmentNumber', 'amendmentTitle', 'approverRole', 'bothApproved', 'contractUrl'], kind: 'transactional' },
  { name: 'contract-amendment-applied', displayNameAr: 'ملحق — تم التطبيق', displayNameEn: 'Amendment applied', category: 'contract', recipient: 'client', trigger: 'apply_contract_amendment RPC', descriptionAr: 'إخطار الطرفين بتطبيق الملحق وتحديث العقد.', descriptionEn: 'Notify both parties that the amendment was applied.', active: true, variables: ['contractRefId', 'amendmentNumber', 'amendmentTitle', 'contractUrl'], kind: 'transactional' },
  { name: 'contract-amendment-rejected', displayNameAr: 'ملحق — تم الرفض', displayNameEn: 'Amendment rejected', category: 'contract', recipient: 'client', trigger: 'reject_contract_amendment RPC', descriptionAr: 'إخطار مُقدم الطلب بأن الملحق رُفض.', descriptionEn: 'Notify requester that the amendment was rejected.', active: true, variables: ['contractRefId', 'amendmentNumber', 'amendmentTitle', 'contractUrl'], kind: 'transactional' },
  { name: 'contract-amendment-cancelled', displayNameAr: 'ملحق — تم الإلغاء', displayNameEn: 'Amendment cancelled', category: 'contract', recipient: 'client', trigger: 'cancel_contract_amendment RPC', descriptionAr: 'إخطار الطرفين بإلغاء طلب الملحق.', descriptionEn: 'Notify both parties that the amendment was cancelled.', active: true, variables: ['contractRefId', 'amendmentNumber', 'amendmentTitle', 'contractUrl'], kind: 'transactional' },

  // ── Membership / Subscriptions ──────────────────────────
  { name: 'membership-upgrade-request-submitted', displayNameAr: 'طلب ترقية باقة — تم الاستلام', displayNameEn: 'Upgrade request submitted', category: 'membership', recipient: 'provider', trigger: 'Membership.tsx — provider submits upgrade request', descriptionAr: 'تأكيد استلام طلب ترقية الباقة.', descriptionEn: 'Confirms receipt of an upgrade request.', active: true, variables: ['recipientName', 'businessName', 'requestedTier'], kind: 'transactional' },
  { name: 'membership-upgrade-request-approved', displayNameAr: 'طلب ترقية باقة — موافقة', displayNameEn: 'Upgrade request approved', category: 'membership', recipient: 'provider', trigger: 'AdminUpgradeRequestsPanel approve', descriptionAr: 'إخطار المزود بالموافقة على ترقية باقته.', descriptionEn: 'Notifies provider that the upgrade was approved.', active: true, variables: ['recipientName', 'businessName', 'approvedTier'], kind: 'transactional' },
  { name: 'membership-upgrade-request-rejected', displayNameAr: 'طلب ترقية باقة — رفض', displayNameEn: 'Upgrade request rejected', category: 'membership', recipient: 'provider', trigger: 'AdminUpgradeRequestsPanel reject', descriptionAr: 'إخطار المزود بعدم اعتماد طلب الترقية.', descriptionEn: 'Notifies provider that the upgrade was not approved.', active: true, variables: ['recipientName', 'businessName', 'requestedTier'], kind: 'transactional' },
  { name: 'membership-subscription-cancelled', displayNameAr: 'اشتراك — تم الإلغاء', displayNameEn: 'Subscription cancelled', category: 'membership', recipient: 'provider', trigger: 'Membership.tsx cancel_subscription', descriptionAr: 'إخطار بإلغاء الاشتراك والعودة للباقة المجانية.', descriptionEn: 'Confirms subscription cancellation and downgrade to free.', active: true, variables: ['recipientName', 'businessName'], kind: 'transactional' },

  // ── Client invitations (CT4C) ───────────────────────────
  { name: 'client-contract-invite', displayNameAr: 'دعوة عميل للعقد', displayNameEn: 'Client contract invitation', category: 'contract', recipient: 'client', trigger: 'create_client_invitation RPC (CT4C)', descriptionAr: 'دعوة عميل جديد للانضمام إلى المنصة قبل إنشاء العقد.', descriptionEn: 'Invite a new client to join the platform before contract creation.', active: false, variables: ['recipientName', 'businessName', 'providerName', 'inviteRef', 'expiryDate', 'acceptUrl'], kind: 'transactional' },
  { name: 'client-invite-reminder', displayNameAr: 'تذكير بدعوة العميل', displayNameEn: 'Client invite reminder', category: 'contract', recipient: 'client', trigger: 'resend_client_invitation RPC (CT4C)', descriptionAr: 'تذكير بدعوة عميل لم يتم قبولها بعد.', descriptionEn: 'Reminder for an unaccepted client invitation.', active: false, variables: ['recipientName', 'businessName', 'inviteRef', 'expiryDate', 'acceptUrl'], kind: 'transactional' },
  { name: 'client-invite-accepted', displayNameAr: 'دعوة عميل — تم القبول', displayNameEn: 'Client invite accepted', category: 'contract', recipient: 'provider', trigger: 'accept_client_invitation RPC (CT4C)', descriptionAr: 'إخطار المزود بأن العميل قبل الدعوة وأصبح حسابه جاهزاً.', descriptionEn: 'Notify the provider that the client accepted the invitation.', active: false, variables: ['recipientName', 'clientName', 'inviteRef', 'dashboardUrl'], kind: 'transactional' },
];

export const TEMPLATE_BY_NAME: Record<string, EmailTemplateMeta> = Object.fromEntries(
  EMAIL_TEMPLATE_CATALOG.map((t) => [t.name, t]),
);

export function getCategoryFor(templateName: string | null | undefined): EmailCategory | 'unknown' {
  if (!templateName) return 'unknown';
  return TEMPLATE_BY_NAME[templateName]?.category ?? 'unknown';
}