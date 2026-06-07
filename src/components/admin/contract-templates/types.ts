export interface CTTemplate {
  id: string;
  slug: string | null;
  name_ar: string;
  name_en: string | null;
  category: string;
  default_locale: string;
  current_version_id: string | null;
  is_active: boolean;
  archived_at: string | null;
  updated_at: string;
}

export type CTVersionStatus =
  | 'draft'
  | 'in_review'
  | 'changes_requested'
  | 'legal_approved'
  | 'published'
  | 'archived'
  | 'superseded';

export interface CTVersion {
  id: string;
  template_id: string;
  version_number: number;
  status: CTVersionStatus;
  language_precedence: string;
  effective_from: string | null;
  published_at: string | null;
  published_by: string | null;
  legal_review_notes: string | null;
  risk_level: string | null;
  archived_at: string | null;
  superseded_by: string | null;
  body_hash: string | null;
  created_at: string;
  updated_at: string;
  legal_reviewer_id?: string | null;
  legal_reviewed_at?: string | null;
  review_requested_at?: string | null;
  changes_requested_at?: string | null;
  review_decision_by?: string | null;
  review_decision_at?: string | null;
  review_status_note?: string | null;
}

export interface CTReviewEvent {
  id: string;
  template_version_id: string;
  action:
    | 'submitted_for_review'
    | 'changes_requested'
    | 'approved_by_legal'
    | 'published'
    | 'archived'
    | 'superseded'
    | 'reverted_to_draft';
  actor_id: string | null;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  risk_level: string | null;
  created_at: string;
}

export const REVIEW_ACTION_META: Record<
  CTReviewEvent['action'],
  { ar: string; en: string; cls: string }
> = {
  submitted_for_review: { ar: 'إرسال للمراجعة', en: 'Submitted for review', cls: 'bg-amber-100 text-amber-800' },
  changes_requested:    { ar: 'طلب تعديلات',    en: 'Changes requested',    cls: 'bg-orange-100 text-orange-800' },
  approved_by_legal:    { ar: 'اعتماد قانوني',  en: 'Approved by legal',    cls: 'bg-blue-100 text-blue-800' },
  published:            { ar: 'تم النشر',       en: 'Published',            cls: 'bg-emerald-100 text-emerald-800' },
  archived:             { ar: 'أرشفة',          en: 'Archived',             cls: 'bg-slate-100 text-slate-600' },
  superseded:           { ar: 'تم الاستبدال',   en: 'Superseded',           cls: 'bg-slate-100 text-slate-600' },
  reverted_to_draft:    { ar: 'إعادة للمسودة',  en: 'Reverted to draft',    cls: 'bg-slate-200 text-slate-700' },
};

export interface CTSection {
  id: string;
  version_id: string;
  section_key: string;
  title_ar: string;
  title_en: string | null;
  is_required: boolean;
  sort_order: number;
}

export interface CTClause {
  id: string;
  section_id: string;
  body_ar: string;
  body_en: string | null;
  is_mandatory: boolean;
  is_editable_by_provider: boolean;
  is_editable_by_client: boolean;
  legal_reference: string | null;
  tags: unknown;
  sort_order: number;
}

export interface CTPricingRule {
  id: string;
  version_id: string;
  method: string;
  is_default: boolean;
  required_fields: unknown;
  formula: string | null;
  rounding: unknown;
  vat_handling: string;
  display_in_pdf: unknown;
}

export interface CTRequiredField {
  id: string;
  version_id: string;
  field_key: string;
  field_type: string;
  label_ar: string;
  label_en: string | null;
  help_ar: string | null;
  help_en: string | null;
  enum_values: unknown;
  is_required: boolean;
  applies_to: string;
  validation: unknown;
  sort_order: number;
}

export interface CTAttachment {
  id: string;
  version_id: string;
  kind: string;
  title_ar: string;
  title_en: string | null;
  file_url: string | null;
  is_mandatory: boolean;
  precedence_order: number;
}

export interface CTMeasurementMethod {
  id: string;
  label_ar: string;
  label_en: string;
  symbol: string | null;
  decimals: number;
  is_active: boolean;
}

export const VERSION_STATUS_META: Record<CTVersionStatus, { ar: string; en: string; cls: string }> = {
  draft: { ar: 'مسودة', en: 'Draft', cls: 'bg-slate-200 text-slate-700' },
  in_review: { ar: 'قيد المراجعة', en: 'In Review', cls: 'bg-amber-100 text-amber-800' },
  changes_requested: { ar: 'تعديلات مطلوبة', en: 'Changes Requested', cls: 'bg-orange-100 text-orange-800' },
  legal_approved: { ar: 'معتمد قانونياً', en: 'Legal Approved', cls: 'bg-blue-100 text-blue-800' },
  published: { ar: 'منشور', en: 'Published', cls: 'bg-emerald-100 text-emerald-800' },
  archived: { ar: 'مؤرشف', en: 'Archived', cls: 'bg-slate-100 text-slate-500' },
  superseded: { ar: 'مستبدل', en: 'Superseded', cls: 'bg-slate-100 text-slate-500' },
};