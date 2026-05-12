/**
 * CT4C.3 — Client invitation helpers
 *
 * Centralises:
 *  - Safe serialization of the contract draft form into `draft_payload`.
 *  - Lightweight masking of email addresses for the awaiting-invite panel.
 *
 * Sensitive fields (file URLs, storage paths, supervisor PII, internal
 * notes) are intentionally excluded from `draft_payload`.
 */

export interface ContractDraftFormLike {
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  total_amount: string;
  currency_code: string;
  start_date: string;
  end_date: string;
  terms_ar: string;
  terms_en: string;
  vat_inclusive: boolean;
  vat_rate: string;
}

export interface DraftPayload {
  title_ar?: string;
  title_en?: string;
  description_ar?: string;
  description_en?: string;
  terms_ar?: string;
  terms_en?: string;
  start_date?: string;
  end_date?: string;
  total_amount?: number;
  currency_code?: string;
  vat_inclusive?: boolean;
  vat_rate?: number;
  template_version_id?: string | null;
  work_type?: string | null;
  pricing_method?: string | null;
}

export function serializeDraftPayload(args: {
  form: ContractDraftFormLike;
  templateVersionId: string | null;
  workType: string | null;
  pricingMethod: string | null;
}): DraftPayload {
  const { form, templateVersionId, workType, pricingMethod } = args;
  const total = Number(form.total_amount);
  const vat = Number(form.vat_rate);
  const out: DraftPayload = {};
  if (form.title_ar) out.title_ar = form.title_ar;
  if (form.title_en) out.title_en = form.title_en;
  if (form.description_ar) out.description_ar = form.description_ar;
  if (form.description_en) out.description_en = form.description_en;
  if (form.terms_ar) out.terms_ar = form.terms_ar;
  if (form.terms_en) out.terms_en = form.terms_en;
  if (form.start_date) out.start_date = form.start_date;
  if (form.end_date) out.end_date = form.end_date;
  if (Number.isFinite(total) && total > 0) out.total_amount = total;
  if (form.currency_code) out.currency_code = form.currency_code;
  out.vat_inclusive = !!form.vat_inclusive;
  if (Number.isFinite(vat)) out.vat_rate = vat;
  if (templateVersionId) out.template_version_id = templateVersionId;
  if (workType) out.work_type = workType;
  if (pricingMethod) out.pricing_method = pricingMethod;
  return out;
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  const head = local.slice(0, 1);
  const tail = local.length > 2 ? local.slice(-1) : '';
  return `${head}***${tail}@${domain}`;
}

export interface PendingInvite {
  id: string;
  ref_id: string;
  email_lower: string;
  expires_at: string;
  reminder_count: number;
}