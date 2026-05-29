/**
 * Pure helper — determines whether a quote can be awarded for an RFQ.
 * MUST NOT import Supabase. Mirrors the DB rules in `procurement_award_quote`.
 */
import type {
  ProcurementRfqRow,
  ProcurementSupplierQuoteRow,
} from '../types';

export type AwardRejectionReason =
  | 'quote_missing'
  | 'rfq_missing'
  | 'rfq_mismatch'
  | 'rfq_not_open'
  | 'quote_not_eligible'
  | 'rfq_already_awarded';

export interface AwardEligibility {
  eligible: boolean;
  reason?: AwardRejectionReason;
}

export function evaluateAwardEligibility(
  quote: ProcurementSupplierQuoteRow | null | undefined,
  rfq: ProcurementRfqRow | null | undefined,
): AwardEligibility {
  if (!quote) return { eligible: false, reason: 'quote_missing' };
  if (!rfq) return { eligible: false, reason: 'rfq_missing' };
  if (quote.rfq_id !== rfq.id) return { eligible: false, reason: 'rfq_mismatch' };
  if (rfq.awarded_quote_id) return { eligible: false, reason: 'rfq_already_awarded' };
  if (rfq.status !== 'draft' && rfq.status !== 'sent')
    return { eligible: false, reason: 'rfq_not_open' };
  if (quote.status !== 'submitted' && quote.status !== 'shortlisted')
    return { eligible: false, reason: 'quote_not_eligible' };
  return { eligible: true };
}