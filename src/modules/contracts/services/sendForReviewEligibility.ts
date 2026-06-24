/**
 * CONTRACT PARTY MODEL — PHASE G
 * Pure eligibility check for sending a draft contract for review.
 * No network, no mutation, no lifecycle change.
 */

export interface SendForReviewContractInput {
  readonly id: string;
  readonly business_id: string | null;
  readonly client_id: string | null;
  readonly template_version_id: string | null;
  readonly terms_ar: string | null;
  readonly total_amount: number | string | null;
}

export interface SendForReviewEligibility {
  readonly isEligible: boolean;
  readonly missing: readonly string[];
}

export function computeSendForReviewEligibility(
  c: SendForReviewContractInput,
  opts: { hasLineItems: boolean; isRTL: boolean },
): SendForReviewEligibility {
  const pick = (a: string, e: string) => (opts.isRTL ? a : e);
  const m: string[] = [];
  if (!c.business_id) m.push(pick('بيانات الطرف الأول ناقصة', 'Missing first party'));
  if (!c.client_id) m.push(pick('بيانات الطرف الثاني ناقصة', 'Missing second party'));
  if (!opts.hasLineItems) m.push(pick('البنود ناقصة', 'Missing line items'));
  if (!c.template_version_id) m.push(pick('القالب ناقص', 'Missing template'));
  if (!c.terms_ar || !String(c.terms_ar).trim()) m.push(pick('شروط العقد ناقصة', 'Missing terms'));
  if (!Number(c.total_amount)) m.push(pick('المبلغ ناقص', 'Missing amount'));
  return { isEligible: m.length === 0, missing: m };
}