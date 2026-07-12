/**
 * OPPORTUNITIES PHASE 5 — bid (offer) domain types.
 *
 * Backed by the new `public.opportunity_bids` table. The opportunity is
 * still a `quote_requests` row and the assignment is still a
 * `quote_request_leads` row — bids are a NEW concept layered on top, not
 * a rename of `rfq_quotes` (which targets the legacy `rfq_requests` flow
 * and stays untouched in this phase).
 */
import type { Database } from '@/integrations/supabase/types';

export type OpportunityBidRow =
  Database['public']['Tables']['opportunity_bids']['Row'];
export type OpportunityBidInsert =
  Database['public']['Tables']['opportunity_bids']['Insert'];
export type OpportunityBidUpdate =
  Database['public']['Tables']['opportunity_bids']['Update'];

export type OpportunityBidStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'revised'
  | 'withdrawn'
  | 'rejected'
  | 'awarded';

export const OPPORTUNITY_BID_EDITABLE_STATUSES: ReadonlyArray<OpportunityBidStatus> = [
  'draft',
  'submitted',
  'revised',
];

export type DurationUnit = 'hour' | 'day' | 'week' | 'month';

/** R2 — single line-item inside a bid price breakdown. */
export interface BidPriceBreakdownItem {
  name: string;
  description?: string | null;
  quantity: number;
  unit?: string | null;
  unit_price: number;
  /** Optional cached line total (quantity * unit_price). */
  total?: number | null;
}

export interface SubmitOpportunityBidInput {
  opportunityId: string;
  assignmentId?: string | null;
  providerBusinessId?: string | null;
  submittedBy: string;
  priceAmount: number;
  currency?: string;
  durationValue?: number | null;
  durationUnit?: DurationUnit | null;
  scopeSummary?: string | null;
  terms?: string | null;
  warranty?: string | null;
  // R2 additive fields — all optional / backward compatible.
  paymentTerms?: string | null;
  validUntil?: string | null;
  vatInclusive?: boolean | null;
  materialsBrandIds?: string[] | null;
  priceBreakdown?: BidPriceBreakdownItem[] | null;
}

export interface UpdateOpportunityBidDraftInput {
  priceAmount?: number | null;
  currency?: string;
  durationValue?: number | null;
  durationUnit?: DurationUnit | null;
  scopeSummary?: string | null;
  terms?: string | null;
  warranty?: string | null;
  paymentTerms?: string | null;
  validUntil?: string | null;
  vatInclusive?: boolean | null;
  materialsBrandIds?: string[] | null;
  priceBreakdown?: BidPriceBreakdownItem[] | null;
}