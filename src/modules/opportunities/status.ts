/**
 * OPPORTUNITIES PHASE 3 — central status mapping.
 *
 * Maps the raw DB enum values (unchanged) to the new opportunity-flavored
 * UI labels. Never writes back to DB; for display only.
 */
import type { BiLabel } from './opportunityLabels';

export type OpportunityStatusKey =
  | 'submitted'
  | 'under_review'
  | 'matched'
  | 'receiving_bids'
  | 'completed'
  | 'cancelled'
  | 'unknown';

/** quote_requests.status (raw DB enum) → OpportunityStatusKey. */
export const OPPORTUNITY_STATUS_MAP: Record<string, OpportunityStatusKey> = {
  new: 'submitted',
  submitted: 'submitted',
  under_review: 'under_review',
  matched: 'matched',
  sent_to_providers: 'matched',
  contacted: 'receiving_bids',
  completed: 'completed',
  closed: 'completed',
  cancelled: 'cancelled',
  expired: 'cancelled',
};

/** quote_request_leads.status (raw) → OpportunityStatusKey for an assignment. */
export const OPPORTUNITY_ASSIGNMENT_STATUS_MAP: Record<string, OpportunityStatusKey> = {
  new: 'submitted',
  viewed: 'under_review',
  contacted: 'receiving_bids',
  accepted: 'matched',
  completed: 'completed',
  rejected: 'cancelled',
  cancelled: 'cancelled',
};

export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatusKey, BiLabel> = {
  submitted:      { ar: 'مُقدَّمة',          en: 'Submitted' },
  under_review:   { ar: 'قيد المراجعة',     en: 'Under Review' },
  matched:        { ar: 'مطابقة',           en: 'Matched' },
  receiving_bids: { ar: 'تستقبل العروض',    en: 'Receiving Bids' },
  completed:      { ar: 'مكتملة',           en: 'Completed' },
  cancelled:      { ar: 'ملغاة',             en: 'Cancelled' },
  unknown:        { ar: 'غير معروفة',       en: 'Unknown' },
};

export function mapOpportunityStatus(raw: string | null | undefined): OpportunityStatusKey {
  if (!raw) return 'unknown';
  return OPPORTUNITY_STATUS_MAP[raw] ?? 'unknown';
}

export function mapAssignmentStatus(raw: string | null | undefined): OpportunityStatusKey {
  if (!raw) return 'unknown';
  return OPPORTUNITY_ASSIGNMENT_STATUS_MAP[raw] ?? 'unknown';
}

export function getOpportunityStatusLabel(raw: string | null | undefined): BiLabel {
  return OPPORTUNITY_STATUS_LABELS[mapOpportunityStatus(raw)];
}

export function getAssignmentStatusLabel(raw: string | null | undefined): BiLabel {
  return OPPORTUNITY_STATUS_LABELS[mapAssignmentStatus(raw)];
}