import {
  Bell, FileText, CreditCard, Megaphone, Settings2, MessageSquare, Wrench,
  AlertTriangle, CheckCircle2, Star, Shield, Clock, Send, PenLine, Eye,
  Gavel, Archive, Undo2, RotateCcw, Rocket,
  Trophy, XCircle, Handshake, UserPlus, Tag, Link2, HelpCircle, ClipboardList,
  Award, DollarSign, Users, ThumbsDown, RefreshCcw,
  type LucideIcon,
} from 'lucide-react';

/* ── Industry-specific notification type keys ── */
export type NotificationType =
  | 'new_message'
  | 'contract_created'
  | 'contract_signed'
  | 'contract_awaiting'
  | 'payment_due'
  | 'stage_completed'
  | 'stage_awaiting'
  | 'new_review'
  | 'review_replied'
  | 'maintenance_request'
  | 'maintenance_update'
  | 'profile_verified'
  | 'warranty_expiring'
  | 'quote_received'
  | 'contract_draft_created_for_client'
  | 'contract_draft_created_for_provider'
  // CT7B — Legal review workflow (admin-only recipients)
  | 'template_review_submitted'
  | 'template_review_changes_requested'
  | 'template_review_reverted'
  | 'template_review_approved'
  | 'template_review_published'
  | 'template_review_archived'
  // Legacy generic types (backward-compatible)
  | 'contract'
  | 'installment'
  | 'promotion'
  | 'message'
  | 'maintenance'
  | 'security'
  | 'system';

/* ── Urgency levels used for badge coloring ── */
export type UrgencyLevel = 'urgent' | 'important' | 'info';

/* ── UI categories for the notification-center filter dropdown ── */
export type NotificationCategory =
  | 'requests'
  | 'bids'
  | 'contracts'
  | 'membership'
  | 'team'
  | 'system';

interface NotificationTypeMeta {
  icon: LucideIcon;
  colorClass: string;
  label: { ar: string; en: string };
  urgency: UrgencyLevel;
  category: NotificationCategory;
}

export const notificationTypeMeta: Record<string, NotificationTypeMeta> = {
  // Industry-specific
  new_message:         { icon: MessageSquare, colorClass: 'bg-secondary/10 text-secondary dark:text-secondary', label: { ar: 'رسالة جديدة', en: 'New Message' }, urgency: 'info', category: 'system' },
  contract_created:    { icon: FileText,      colorClass: 'bg-info/10 text-info dark:text-info',     label: { ar: 'عقد جديد', en: 'New Contract' }, urgency: 'important', category: 'contracts' },
  contract_signed:     { icon: PenLine,       colorClass: 'bg-success/10 text-success dark:text-success', label: { ar: 'عقد تم توقيعه', en: 'Contract Signed' }, urgency: 'info', category: 'contracts' },
  contract_awaiting:   { icon: Clock,         colorClass: 'bg-warning/10 text-warning dark:text-warning',  label: { ar: 'عقد ينتظر توقيعك', en: 'Awaiting Signature' }, urgency: 'urgent', category: 'contracts' },
  payment_due:         { icon: CreditCard,    colorClass: 'bg-destructive/10 text-destructive dark:text-destructive',        label: { ar: 'دفعة مستحقة', en: 'Payment Due' }, urgency: 'urgent', category: 'contracts' },
  stage_completed:     { icon: CheckCircle2,  colorClass: 'bg-success/10 text-success dark:text-success', label: { ar: 'مرحلة اكتملت', en: 'Stage Completed' }, urgency: 'info', category: 'contracts' },
  stage_awaiting:      { icon: Eye,           colorClass: 'bg-warning/10 text-warning dark:text-warning',  label: { ar: 'مرحلة تنتظر تأكيدك', en: 'Stage Awaiting' }, urgency: 'urgent', category: 'contracts' },
  new_review:          { icon: Star,          colorClass: 'bg-warning/10 text-warning dark:text-warning', label: { ar: 'تقييم جديد', en: 'New Review' }, urgency: 'info', category: 'system' },
  review_replied:      { icon: Send,          colorClass: 'bg-secondary/10 text-secondary dark:text-secondary', label: { ar: 'رد على تقييمك', en: 'Review Reply' }, urgency: 'info', category: 'system' },
  maintenance_request: { icon: Wrench,        colorClass: 'bg-urgent/10 text-urgent dark:text-urgent', label: { ar: 'طلب صيانة', en: 'Maintenance Request' }, urgency: 'important', category: 'contracts' },
  maintenance_update:  { icon: Wrench,        colorClass: 'bg-urgent/10 text-urgent dark:text-urgent', label: { ar: 'تحديث صيانة', en: 'Maintenance Update' }, urgency: 'info', category: 'contracts' },
  profile_verified:    { icon: Shield,        colorClass: 'bg-success/10 text-success dark:text-success', label: { ar: 'منشأة موثقة', en: 'Profile Verified' }, urgency: 'info', category: 'system' },
  warranty_expiring:   { icon: AlertTriangle, colorClass: 'bg-warning/10 text-warning dark:text-warning',  label: { ar: 'ضمان ينتهي', en: 'Warranty Expiring' }, urgency: 'important', category: 'contracts' },
  quote_received:      { icon: FileText,      colorClass: 'bg-accent/10 text-accent',                            label: { ar: 'عرض سعر', en: 'Quote Received' }, urgency: 'important', category: 'bids' },
  contract_draft_created_for_client:   { icon: FileText, colorClass: 'bg-info/10 text-info dark:text-info', label: { ar: 'مسودة عقد لطلبك', en: 'Contract Draft Created' }, urgency: 'important', category: 'contracts' },
  contract_draft_created_for_provider: { icon: FileText, colorClass: 'bg-info/10 text-info dark:text-info', label: { ar: 'مسودة عقد جديدة', en: 'New Contract Draft' }, urgency: 'important', category: 'contracts' },
  // CT7B — Legal review workflow
  template_review_submitted:         { icon: Gavel,   colorClass: 'bg-info/10 text-info dark:text-info',           label: { ar: 'قالب قيد المراجعة',  en: 'Template In Review' },     urgency: 'important', category: 'system' },
  template_review_changes_requested: { icon: Undo2,   colorClass: 'bg-warning/10 text-warning dark:text-warning',  label: { ar: 'تعديلات مطلوبة',     en: 'Changes Requested' },      urgency: 'important', category: 'system' },
  template_review_reverted:          { icon: RotateCcw, colorClass: 'bg-muted text-muted-foreground',              label: { ar: 'إعادة إلى المسودة',  en: 'Reverted to Draft' },      urgency: 'info',      category: 'system' },
  template_review_approved:          { icon: Shield,  colorClass: 'bg-success/10 text-success dark:text-success',  label: { ar: 'اعتماد قانوني',      en: 'Legally Approved' },       urgency: 'important', category: 'system' },
  template_review_published:         { icon: Rocket,  colorClass: 'bg-success/10 text-success dark:text-success',  label: { ar: 'نشر القالب',         en: 'Template Published' },     urgency: 'important', category: 'system' },
  template_review_archived:          { icon: Archive, colorClass: 'bg-muted text-muted-foreground',                label: { ar: 'أرشفة القالب',       en: 'Template Archived' },      urgency: 'info',      category: 'system' },

  // ── Opportunity / RFQ lifecycle (P1.1)
  opportunity_created:                { icon: Rocket,        colorClass: 'bg-info/10 text-info',                              label: { ar: 'فرصة جديدة',              en: 'New Opportunity' },           urgency: 'important', category: 'requests' },
  opportunity_provider_matched:       { icon: Handshake,     colorClass: 'bg-accent/10 text-accent',                          label: { ar: 'مطابقة مزوّد',            en: 'Provider Matched' },          urgency: 'important', category: 'requests' },
  opportunity_assigned:               { icon: ClipboardList, colorClass: 'bg-info/10 text-info',                              label: { ar: 'إسناد فرصة',              en: 'Opportunity Assigned' },      urgency: 'important', category: 'requests' },
  opportunity_bid_submitted:          { icon: FileText,      colorClass: 'bg-accent/10 text-accent',                          label: { ar: 'تقديم عرض',               en: 'Bid Submitted' },             urgency: 'important', category: 'bids' },
  opportunity_bid_revised:            { icon: RefreshCcw,    colorClass: 'bg-info/10 text-info',                              label: { ar: 'تعديل عرض',               en: 'Bid Revised' },               urgency: 'info',      category: 'bids' },
  opportunity_bid_shortlisted:        { icon: Star,          colorClass: 'bg-warning/10 text-warning',                        label: { ar: 'وصل عرضك للقائمة القصيرة', en: 'Bid Shortlisted' },          urgency: 'important', category: 'bids' },
  opportunity_bid_declined:           { icon: ThumbsDown,    colorClass: 'bg-muted text-muted-foreground',                    label: { ar: 'استبعاد عرض',             en: 'Bid Declined' },              urgency: 'info',      category: 'bids' },
  opportunity_bid_revision_requested: { icon: Undo2,         colorClass: 'bg-warning/10 text-warning',                        label: { ar: 'طلب تعديل على العرض',      en: 'Bid Revision Requested' },   urgency: 'important', category: 'bids' },
  opportunity_awarded:                { icon: Trophy,        colorClass: 'bg-success/10 text-success',                        label: { ar: 'ترسية الفرصة',            en: 'Opportunity Awarded' },       urgency: 'urgent',    category: 'bids' },
  opportunity_award_lost:             { icon: XCircle,       colorClass: 'bg-muted text-muted-foreground',                    label: { ar: 'لم يتم الترسية عليك',      en: 'Award Not Granted' },        urgency: 'info',      category: 'bids' },
  opportunity_contract_converted:     { icon: FileText,      colorClass: 'bg-success/10 text-success',                        label: { ar: 'تحويل الفرصة إلى عقد',     en: 'Converted to Contract' },    urgency: 'important', category: 'contracts' },
  rfq_clarification_posted:           { icon: HelpCircle,    colorClass: 'bg-info/10 text-info',                              label: { ar: 'استفسار على الطلب',        en: 'RFQ Clarification Posted' }, urgency: 'important', category: 'requests' },
  opportunity_cancelled:              { icon: XCircle,       colorClass: 'bg-destructive/10 text-destructive',                label: { ar: 'إلغاء الفرصة',            en: 'Opportunity Cancelled' },     urgency: 'info',      category: 'requests' },
  opportunity_expired:                { icon: Clock,         colorClass: 'bg-muted text-muted-foreground',                    label: { ar: 'انتهاء الفرصة',           en: 'Opportunity Expired' },       urgency: 'info',      category: 'requests' },
  lead_cancelled:                     { icon: XCircle,       colorClass: 'bg-muted text-muted-foreground',                    label: { ar: 'إلغاء الفرصة',            en: 'Lead Cancelled' },            urgency: 'info',      category: 'requests' },
  quote_contact_revealed:             { icon: Eye,           colorClass: 'bg-accent/10 text-accent',                          label: { ar: 'كشف بيانات التواصل',       en: 'Contact Revealed' },         urgency: 'important', category: 'requests' },

  // ── Requests / leads / quotes fan-out (P1.1)
  quote_request_submitted:      { icon: FileText,      colorClass: 'bg-info/10 text-info',        label: { ar: 'إرسال طلب عرض سعر',       en: 'Quote Request Submitted' },     urgency: 'important', category: 'requests' },
  quote_request_new_admin:      { icon: FileText,      colorClass: 'bg-warning/10 text-warning',  label: { ar: 'طلب عرض سعر جديد',        en: 'New Quote Request' },           urgency: 'important', category: 'requests' },
  quote_request_status_updated: { icon: ClipboardList, colorClass: 'bg-info/10 text-info',        label: { ar: 'تحديث حالة طلب العرض',    en: 'Quote Request Status Updated' }, urgency: 'info',      category: 'requests' },
  quote_lead_assigned:          { icon: Handshake,     colorClass: 'bg-accent/10 text-accent',    label: { ar: 'إسناد فرصة بيع',          en: 'Lead Assigned' },               urgency: 'important', category: 'requests' },

  // ── Contracts (P1.1)
  contract_milestone_completed: { icon: CheckCircle2,  colorClass: 'bg-success/10 text-success',   label: { ar: 'اكتمال مرحلة من العقد', en: 'Contract Milestone Completed' }, urgency: 'important', category: 'contracts' },
  contract_payment_recorded:    { icon: DollarSign,    colorClass: 'bg-success/10 text-success',   label: { ar: 'تسجيل دفعة عقد',        en: 'Contract Payment Recorded' },    urgency: 'important', category: 'contracts' },

  // ── Membership (P1.1)
  membership_payment_succeeded:       { icon: CreditCard,   colorClass: 'bg-success/10 text-success',    label: { ar: 'نجاح دفعة العضوية',              en: 'Membership Payment Succeeded' }, urgency: 'important', category: 'membership' },
  membership_payment_marked_paid:     { icon: DollarSign,   colorClass: 'bg-success/10 text-success',    label: { ar: 'تأكيد دفعة العضوية يدويًا',       en: 'Membership Payment Marked Paid' }, urgency: 'info',      category: 'membership' },
  membership_payment_marked_refunded: { icon: DollarSign,   colorClass: 'bg-warning/10 text-warning',    label: { ar: 'استرداد دفعة العضوية يدويًا',     en: 'Membership Payment Marked Refunded' }, urgency: 'info',   category: 'membership' },
  membership_payment_failed:          { icon: AlertTriangle,colorClass: 'bg-destructive/10 text-destructive', label: { ar: 'فشل دفعة العضوية',            en: 'Membership Payment Failed' },   urgency: 'urgent',    category: 'membership' },
  membership_payment_refunded:        { icon: DollarSign,   colorClass: 'bg-warning/10 text-warning',    label: { ar: 'استرداد دفعة العضوية',            en: 'Membership Payment Refunded' }, urgency: 'info',      category: 'membership' },

  // ── Team / invitations / brand approvals (P1.1)
  business_staff_invitation:    { icon: UserPlus,   colorClass: 'bg-accent/10 text-accent',       label: { ar: 'دعوة موظف للمنشأة',       en: 'Staff Invitation' },        urgency: 'important', category: 'team' },
  brand_request_approved:       { icon: Award,      colorClass: 'bg-success/10 text-success',     label: { ar: 'اعتماد طلب علامة تجارية', en: 'Brand Request Approved' },   urgency: 'important', category: 'team' },
  brand_request_rejected:       { icon: XCircle,    colorClass: 'bg-destructive/10 text-destructive', label: { ar: 'رفض طلب علامة تجارية',    en: 'Brand Request Rejected' },   urgency: 'info',      category: 'team' },
  provider_brand_link_approved: { icon: Link2,      colorClass: 'bg-success/10 text-success',     label: { ar: 'اعتماد ربط العلامة',      en: 'Brand Link Approved' },      urgency: 'info',      category: 'team' },
  provider_brand_link_rejected: { icon: Link2,      colorClass: 'bg-muted text-muted-foreground', label: { ar: 'رفض ربط العلامة',         en: 'Brand Link Rejected' },      urgency: 'info',      category: 'team' },

  // ── P3 — admin + owner platform lifecycle
  provider_submission_new:        { icon: ClipboardList, colorClass: 'bg-warning/10 text-warning',      label: { ar: 'منشأة جديدة بانتظار المراجعة', en: 'New Provider Submission' }, urgency: 'important', category: 'system' },
  business_verification_changed:  { icon: Shield,        colorClass: 'bg-info/10 text-info',            label: { ar: 'تحديث توثيق المنشأة',           en: 'Business Verification Updated' }, urgency: 'important', category: 'system' },
  account_contact_updated:        { icon: Bell,          colorClass: 'bg-muted text-muted-foreground',  label: { ar: 'تحديث بيانات الاتصال',          en: 'Account Contact Updated' },       urgency: 'info',      category: 'system' },

  // ── Phase E — post-award cancellation request lifecycle
  rfq_cancellation_requested:     { icon: XCircle,       colorClass: 'bg-warning/10 text-warning',      label: { ar: 'طلب إلغاء بعد الترسية',         en: 'Cancellation Requested' },        urgency: 'important', category: 'requests' },
  rfq_cancellation_accepted:      { icon: CheckCircle2,  colorClass: 'bg-success/10 text-success',      label: { ar: 'قبول إلغاء التعاقد',             en: 'Cancellation Accepted' },         urgency: 'important', category: 'requests' },
  rfq_cancellation_rejected:      { icon: ThumbsDown,    colorClass: 'bg-destructive/10 text-destructive', label: { ar: 'رفض إلغاء التعاقد',              en: 'Cancellation Rejected' },         urgency: 'important', category: 'requests' },

  // Legacy generic types
  contract:    { icon: FileText,      colorClass: 'bg-info/10 text-info dark:text-info',     label: { ar: 'العقود', en: 'Contracts' }, urgency: 'important', category: 'contracts' },
  installment: { icon: CreditCard,    colorClass: 'bg-success/10 text-success dark:text-success', label: { ar: 'الأقساط', en: 'Installments' }, urgency: 'important', category: 'contracts' },
  promotion:   { icon: Megaphone,     colorClass: 'bg-secondary/10 text-secondary dark:text-secondary',  label: { ar: 'العروض', en: 'Promotions' }, urgency: 'info', category: 'system' },
  message:     { icon: MessageSquare, colorClass: 'bg-secondary/10 text-secondary dark:text-secondary',  label: { ar: 'الرسائل', en: 'Messages' }, urgency: 'info', category: 'system' },
  maintenance: { icon: Wrench,        colorClass: 'bg-urgent/10 text-urgent dark:text-urgent',  label: { ar: 'الصيانة', en: 'Maintenance' }, urgency: 'important', category: 'contracts' },
  security:    { icon: AlertTriangle, colorClass: 'bg-destructive/10 text-destructive',                     label: { ar: 'الأمان', en: 'Security' }, urgency: 'urgent', category: 'system' },
  system:      { icon: Settings2,     colorClass: 'bg-muted text-muted-foreground',                         label: { ar: 'النظام', en: 'System' }, urgency: 'info', category: 'system' },
};

const fallbackMeta: NotificationTypeMeta = notificationTypeMeta.system;

/* ── Helpers ── */
export function getNotificationMeta(n: { notification_type: string; reference_type?: string | null; [key: string]: any }): NotificationTypeMeta {
  // Overdue items always show as urgent/security
  if (n.reference_type?.startsWith('overdue_')) return notificationTypeMeta.security;
  // Try reference_type first (more specific), then notification_type
  return notificationTypeMeta[n.reference_type || ''] || notificationTypeMeta[n.notification_type] || fallbackMeta;
}

export function isUrgentNotification(n: { notification_type: string; reference_type?: string | null; [key: string]: any }): boolean {
  const meta = getNotificationMeta(n);
  return meta.urgency === 'urgent';
}

/* ── Filter labels for UI — Arabic-first modern categories ── */
export const typeFilterLabels: Record<string, { ar: string; en: string }> = {
  all:         { ar: 'الكل',                 en: 'All' },
  requests:    { ar: 'طلبات وفرص',           en: 'Requests & Opportunities' },
  bids:        { ar: 'العروض والترسية',      en: 'Bids & Awards' },
  contracts:   { ar: 'العقود والمدفوعات',    en: 'Contracts & Payments' },
  membership:  { ar: 'العضوية',              en: 'Membership' },
  team:        { ar: 'الفريق والدعوات',      en: 'Team & Invitations' },
  system:      { ar: 'النظام',               en: 'System' },
};

/** Return the UI category for a given notification (or reference) type. */
export function getNotificationCategory(
  n: { notification_type?: string | null; reference_type?: string | null } | string | null | undefined,
): NotificationCategory {
  if (!n) return 'system';
  const key = typeof n === 'string'
    ? n
    : (n.notification_type || n.reference_type || '');
  const meta = notificationTypeMeta[key];
  return meta?.category ?? 'system';
}

/**
 * True if a notification matches the current filter selection.
 * - `'all'` → always true.
 * - a category id (`requests`, `bids`, `contracts`, `membership`, `team`, `system`)
 *   → matches every notification whose type belongs to that category.
 * - any other value → treated as an exact `notification_type` match
 *   (backwards-compat for lifecycle quick chips).
 */
export function notificationMatchesTypeFilter(
  n: { notification_type?: string | null; reference_type?: string | null },
  filter: string,
): boolean {
  if (!filter || filter === 'all') return true;
  const CATEGORY_KEYS: NotificationCategory[] = ['requests', 'bids', 'contracts', 'membership', 'team', 'system'];
  if ((CATEGORY_KEYS as string[]).includes(filter)) {
    return getNotificationCategory(n) === filter;
  }
  return n.notification_type === filter;
}
