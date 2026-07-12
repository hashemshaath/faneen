/**
 * R5.3 — Pure helper for computing the end-to-end journey state of an
 * opportunity from the client's perspective, and the provider's own
 * bid state per opportunity. UI-only aggregation, zero side effects.
 *
 * Inputs are minimally-typed on purpose so tests and callers do not
 * need the full DB row types.
 */

export type RfqJourneyState =
  | 'awaiting_bids'
  | 'bids_in'
  | 'shortlisted'
  | 'revision_requested'
  | 'awarded'
  | 'sample_pending'
  | 'converted'
  | 'closed';

export interface JourneyRequestInput {
  status: string;
  awarded_bid_id?: string | null;
  requires_sample?: boolean | null;
}

export interface JourneyBidInput {
  id: string;
  status: string;
}

/**
 * Deterministic decision tree — order matters. A request lands in
 * exactly one bucket.
 *
 *  1. hasContract                 → converted
 *  2. status cancelled/completed  → closed
 *  3. awarded_bid_id set:
 *       requires_sample && sample not approved → sample_pending
 *       else                                    → awarded
 *  4. any bid revision_requested  → revision_requested
 *  5. any bid shortlisted         → shortlisted
 *  6. bids.length > 0             → bids_in
 *  7. otherwise                    → awaiting_bids
 */
export function computeRfqJourneyState(
  request: JourneyRequestInput,
  bids: readonly JourneyBidInput[],
  latestSampleStatus: string | null,
  hasContract: boolean,
): RfqJourneyState {
  if (hasContract) return 'converted';
  if (request.status === 'cancelled' || request.status === 'completed') return 'closed';
  if (request.awarded_bid_id) {
    if (request.requires_sample && latestSampleStatus !== 'approved') {
      return 'sample_pending';
    }
    return 'awarded';
  }
  if (bids.some((b) => b.status === 'revision_requested')) return 'revision_requested';
  if (bids.some((b) => b.status === 'shortlisted')) return 'shortlisted';
  if (bids.length > 0) return 'bids_in';
  return 'awaiting_bids';
}

export const RFQ_JOURNEY_STATE_LABEL_AR: Record<RfqJourneyState, string> = {
  awaiting_bids: 'بانتظار العروض',
  bids_in: 'وردت عروض',
  shortlisted: 'قائمة قصيرة',
  revision_requested: 'طلب تعديل',
  awarded: 'معمّد',
  sample_pending: 'عينة قيد الاعتماد',
  converted: 'محوّل لعقد',
  closed: 'مغلق',
};

/** Tone maps directly to `AdminStatusBadge` tones. */
export const RFQ_JOURNEY_STATE_TONE: Record<
  RfqJourneyState,
  'muted' | 'info' | 'warning' | 'primary' | 'accent' | 'success'
> = {
  awaiting_bids: 'muted',
  bids_in: 'info',
  shortlisted: 'accent',
  revision_requested: 'warning',
  awarded: 'primary',
  sample_pending: 'warning',
  converted: 'success',
  closed: 'muted',
};

/* -------------------------------------------------------------------------- */
/*  Provider-side per-opportunity state                                        */
/* -------------------------------------------------------------------------- */

export type ProviderBidState =
  | 'not_submitted'
  | 'submitted'
  | 'revision_requested_by_client'
  | 'shortlisted'
  | 'won'
  | 'lost';

/**
 * Given the provider's own most-recent bid on an opportunity (or none),
 * plus the awarded_bid_id of that opportunity, return one bucket.
 *
 *  - no bid                                → not_submitted
 *  - my bid is awarded                     → won
 *  - my bid is rejected/withdrawn          → lost
 *  - my bid.status === 'revision_requested'→ revision_requested_by_client
 *  - my bid.status === 'shortlisted'       → shortlisted
 *  - awarded_bid_id set & not mine         → lost
 *  - otherwise                              → submitted
 */
export function computeProviderBidState(
  myBid: { id: string; status: string } | null,
  awardedBidId: string | null | undefined,
): ProviderBidState {
  if (!myBid) return 'not_submitted';
  if (awardedBidId && myBid.id === awardedBidId) return 'won';
  if (myBid.status === 'awarded') return 'won';
  if (myBid.status === 'rejected' || myBid.status === 'withdrawn') return 'lost';
  if (myBid.status === 'revision_requested') return 'revision_requested_by_client';
  if (myBid.status === 'shortlisted') return 'shortlisted';
  if (awardedBidId && myBid.id !== awardedBidId) return 'lost';
  return 'submitted';
}

export const PROVIDER_BID_STATE_LABEL_AR: Record<ProviderBidState, string> = {
  not_submitted: 'لم أقدّم عرضاً',
  submitted: 'قدمت عرضاً',
  revision_requested_by_client: 'طلب تعديل مني',
  shortlisted: 'في القائمة القصيرة',
  won: 'فزت',
  lost: 'لم يُوفَّق',
};

export const PROVIDER_BID_STATE_TONE: Record<
  ProviderBidState,
  'muted' | 'info' | 'warning' | 'accent' | 'success' | 'destructive'
> = {
  not_submitted: 'muted',
  submitted: 'info',
  revision_requested_by_client: 'warning',
  shortlisted: 'accent',
  won: 'success',
  lost: 'destructive',
};