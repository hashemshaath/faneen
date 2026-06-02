import type { LucideIcon } from 'lucide-react';

export type ApprovalStatus =
  | 'draft' | 'submitted' | 'under_review'
  | 'approved' | 'rejected' | 'needs_changes' | 'published';

export type UsernameStatus = 'pending' | 'approved' | 'rejected';

export type SortKey = 'submitted_desc' | 'submitted_asc' | 'completion_desc' | 'name_asc';

export interface ProviderRow {
  id: string;
  ref_id: string | null;
  user_id: string;
  name_ar: string | null;
  name_en: string | null;
  username: string | null;
  username_status: UsernameStatus | null;
  logo_url: string | null;
  description_ar: string | null;
  short_description_ar: string | null;
  email: string | null;
  phone: string | null;
  approval_status: ApprovalStatus | null;
  approval_notes: string | null;
  onboarding_completion: number | null;
  sectors: string[] | null;
  sub_services: string[] | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  created_at: string;
  national_id: string | null;
  unified_number: string | null;
  vat_number: string | null;
  cr_document_url: string | null;
  cr_document_uploaded_at: string | null;
  cr_owner_name: string | null;
  cr_legal_entity: string | null;
  cr_issue_date: string | null;
  cr_expiry_date: string | null;
  is_active: boolean | null;
  is_demo: boolean | null;
}

export const STATUSES: { value: ApprovalStatus | 'all'; ar: string; en: string }[] = [
  { value: 'all',           ar: 'الكل',           en: 'All' },
  { value: 'submitted',     ar: 'تم الإرسال',     en: 'Submitted' },
  { value: 'under_review',  ar: 'قيد المراجعة',   en: 'Under Review' },
  { value: 'needs_changes', ar: 'يحتاج تعديل',    en: 'Needs Changes' },
  { value: 'approved',      ar: 'موافق',          en: 'Approved' },
  { value: 'published',     ar: 'منشور',          en: 'Published' },
  { value: 'rejected',      ar: 'مرفوض',          en: 'Rejected' },
  { value: 'draft',         ar: 'مسودة',          en: 'Draft' },
];

export const TONE: Record<ApprovalStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-info/10 text-info',
  under_review: 'bg-info/10 text-info',
  needs_changes: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  published: 'bg-success/10 text-success',
};

export const NOTIFY_MAP: Partial<Record<ApprovalStatus, {
  template: 'provider-approved' | 'provider-rejected' | 'provider-revision-requested';
  titleAr: string; bodyAr: string; titleEn: string; bodyEn: string;
}>> = {
  approved: {
    template: 'provider-approved',
    titleAr: 'تم اعتماد حساب منشأتك في قِطاعات',
    bodyAr: 'تم اعتماد حساب منشأتك ويمكنك الآن إدارة ملفك واستقبال الطلبات عبر منصة قِطاعات.',
    titleEn: 'Your provider account has been approved',
    bodyEn: 'Your provider account is now active. You can manage your profile and receive requests on Qitaat.',
  },
  rejected: {
    template: 'provider-rejected',
    titleAr: 'لم يتم اعتماد حساب منشأتك',
    bodyAr: 'نأسف، لم يتم اعتماد حساب منشأتك حالياً. يمكنك مراجعة الملاحظات وتحديث البيانات عند الحاجة.',
    titleEn: 'Provider account not approved',
    bodyEn: 'Your provider account was not approved. Review the notes and update your details if needed.',
  },
  needs_changes: {
    template: 'provider-revision-requested',
    titleAr: 'مطلوب تحديث بيانات منشأتك',
    bodyAr: 'يحتاج طلب التسجيل إلى بعض التعديلات قبل الاعتماد. يرجى مراجعة الملاحظات وإعادة الإرسال.',
    titleEn: 'Updates required on your provider profile',
    bodyEn: 'Your registration needs a few updates before approval. Review the notes and resubmit.',
  },
};

// Reserved for future per-status iconography in extracted children.
export type StatusIconMap = Partial<Record<ApprovalStatus, LucideIcon>>;