import {
  Bell, FileText, CreditCard, Megaphone, Settings2, MessageSquare, Wrench,
  AlertTriangle, CheckCircle2, Star, Shield, Clock, Send, PenLine, Eye,
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

interface NotificationTypeMeta {
  icon: LucideIcon;
  colorClass: string;
  label: { ar: string; en: string };
  urgency: UrgencyLevel;
}

export const notificationTypeMeta: Record<string, NotificationTypeMeta> = {
  // Industry-specific
  new_message:         { icon: MessageSquare, colorClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', label: { ar: 'رسالة جديدة', en: 'New Message' }, urgency: 'info' },
  contract_created:    { icon: FileText,      colorClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',     label: { ar: 'عقد جديد', en: 'New Contract' }, urgency: 'important' },
  contract_signed:     { icon: PenLine,       colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: { ar: 'عقد تم توقيعه', en: 'Contract Signed' }, urgency: 'info' },
  contract_awaiting:   { icon: Clock,         colorClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',  label: { ar: 'عقد ينتظر توقيعك', en: 'Awaiting Signature' }, urgency: 'urgent' },
  payment_due:         { icon: CreditCard,    colorClass: 'bg-red-500/10 text-red-600 dark:text-red-400',        label: { ar: 'دفعة مستحقة', en: 'Payment Due' }, urgency: 'urgent' },
  stage_completed:     { icon: CheckCircle2,  colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: { ar: 'مرحلة اكتملت', en: 'Stage Completed' }, urgency: 'info' },
  stage_awaiting:      { icon: Eye,           colorClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',  label: { ar: 'مرحلة تنتظر تأكيدك', en: 'Stage Awaiting' }, urgency: 'urgent' },
  new_review:          { icon: Star,          colorClass: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400', label: { ar: 'تقييم جديد', en: 'New Review' }, urgency: 'info' },
  review_replied:      { icon: Send,          colorClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', label: { ar: 'رد على تقييمك', en: 'Review Reply' }, urgency: 'info' },
  maintenance_request: { icon: Wrench,        colorClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', label: { ar: 'طلب صيانة', en: 'Maintenance Request' }, urgency: 'important' },
  maintenance_update:  { icon: Wrench,        colorClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', label: { ar: 'تحديث صيانة', en: 'Maintenance Update' }, urgency: 'info' },
  profile_verified:    { icon: Shield,        colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: { ar: 'منشأة موثقة', en: 'Profile Verified' }, urgency: 'info' },
  warranty_expiring:   { icon: AlertTriangle, colorClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',  label: { ar: 'ضمان ينتهي', en: 'Warranty Expiring' }, urgency: 'important' },
  quote_received:      { icon: FileText,      colorClass: 'bg-accent/10 text-accent',                            label: { ar: 'عرض سعر', en: 'Quote Received' }, urgency: 'important' },
  // Legacy generic types
  contract:    { icon: FileText,      colorClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',     label: { ar: 'العقود', en: 'Contracts' }, urgency: 'important' },
  installment: { icon: CreditCard,    colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: { ar: 'الأقساط', en: 'Installments' }, urgency: 'important' },
  promotion:   { icon: Megaphone,     colorClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',  label: { ar: 'العروض', en: 'Promotions' }, urgency: 'info' },
  message:     { icon: MessageSquare, colorClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',  label: { ar: 'الرسائل', en: 'Messages' }, urgency: 'info' },
  maintenance: { icon: Wrench,        colorClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',  label: { ar: 'الصيانة', en: 'Maintenance' }, urgency: 'important' },
  security:    { icon: AlertTriangle, colorClass: 'bg-destructive/10 text-destructive',                     label: { ar: 'الأمان', en: 'Security' }, urgency: 'urgent' },
  system:      { icon: Settings2,     colorClass: 'bg-muted text-muted-foreground',                         label: { ar: 'النظام', en: 'System' }, urgency: 'info' },
};

const fallbackMeta: NotificationTypeMeta = notificationTypeMeta.system;

/* ── Helpers ── */
export function getNotificationMeta(n: { notification_type: string; reference_type?: string | null }): NotificationTypeMeta {
  // Overdue items always show as urgent/security
  if (n.reference_type?.startsWith('overdue_')) return notificationTypeMeta.security;
  // Try reference_type first (more specific), then notification_type
  return notificationTypeMeta[n.reference_type || ''] || notificationTypeMeta[n.notification_type] || fallbackMeta;
}

export function isUrgentNotification(n: { notification_type: string; reference_type?: string | null }): boolean {
  const meta = getNotificationMeta(n);
  return meta.urgency === 'urgent';
}

/* ── Filter labels for UI ── */
export const typeFilterLabels: Record<string, { ar: string; en: string }> = {
  all:          { ar: 'الكل', en: 'All' },
  contract:     { ar: 'العقود', en: 'Contracts' },
  installment:  { ar: 'الأقساط', en: 'Installments' },
  promotion:    { ar: 'العروض', en: 'Promotions' },
  message:      { ar: 'الرسائل', en: 'Messages' },
  maintenance:  { ar: 'الصيانة', en: 'Maintenance' },
  security:     { ar: 'الأمان', en: 'Security' },
  system:       { ar: 'النظام', en: 'System' },
};
