/**
 * R5.3 — Lightweight aggregate query that loads the four data points
 * the `computeRfqJourneyState` helper needs. One round-trip per table
 * (three or four total) — scoped to the currently-loaded list page.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  computeRfqJourneyState,
  type RfqJourneyState,
} from './journeyState';

export interface JourneyAggregate {
  states: Map<string, RfqJourneyState>;
}

export async function loadJourneyAggregatesForQuotes(
  quoteIds: string[],
): Promise<JourneyAggregate> {
  const states = new Map<string, RfqJourneyState>();
  if (quoteIds.length === 0) return { states };

  const [qrRes, bidsRes, contractRes] = await Promise.all([
    supabase
      .from('quote_requests')
      .select('id, status, awarded_bid_id, requires_sample')
      .in('id', quoteIds),
    supabase
      .from('opportunity_bids')
      .select('id, opportunity_id, status')
      .in('opportunity_id', quoteIds),
    supabase
      .from('contracts')
      .select('id, opportunity_id')
      .in('opportunity_id', quoteIds),
  ]);

  type QR = {
    id: string;
    status: string;
    awarded_bid_id: string | null;
    requires_sample: boolean | null;
  };
  type Bid = { id: string; opportunity_id: string; status: string };
  type Contract = { id: string; opportunity_id: string };

  const qrs = (qrRes.data ?? []) as unknown as QR[];
  const bids = (bidsRes.data ?? []) as unknown as Bid[];
  const contracts = (contractRes.data ?? []) as unknown as Contract[];

  const bidsByOpp = new Map<string, Bid[]>();
  bids.forEach((b) => {
    const arr = bidsByOpp.get(b.opportunity_id) ?? [];
    arr.push(b);
    bidsByOpp.set(b.opportunity_id, arr);
  });

  const contractByOpp = new Set(contracts.map((c) => c.opportunity_id));

  const awardedBidsNeedingSample = qrs
    .filter((q) => q.requires_sample && q.awarded_bid_id)
    .map((q) => q.awarded_bid_id as string);

  const sampleStatusByBid = new Map<string, string>();
  if (awardedBidsNeedingSample.length > 0) {
    const { data: samples } = await supabase
      .from('rfq_samples')
      .select('bid_id, status, created_at')
      .in('bid_id', awardedBidsNeedingSample)
      .order('created_at', { ascending: false });
    (samples as unknown as { bid_id: string; status: string }[] | null ?? []).forEach((s) => {
      if (!sampleStatusByBid.has(s.bid_id)) sampleStatusByBid.set(s.bid_id, s.status);
    });
  }

  qrs.forEach((q) => {
    const oppBids = bidsByOpp.get(q.id) ?? [];
    const latestSample = q.awarded_bid_id
      ? sampleStatusByBid.get(q.awarded_bid_id) ?? null
      : null;
    const state = computeRfqJourneyState(
      {
        status: q.status,
        awarded_bid_id: q.awarded_bid_id,
        requires_sample: q.requires_sample,
      },
      oppBids.map((b) => ({ id: b.id, status: b.status })),
      latestSample,
      contractByOpp.has(q.id),
    );
    states.set(q.id, state);
  });

  return { states };
}