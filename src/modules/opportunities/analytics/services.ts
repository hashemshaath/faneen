/**
 * OPPORTUNITIES PHASE 8 — analytics services (read-only).
 *
 * Aggregates opportunity lifecycle metrics directly from the canonical
 * tables (`quote_requests`, `quote_request_leads`, `opportunity_bids`,
 * `contracts`). No elevated keys, no writes, no schema changes.
 *
 * Admin RLS gates these reads — non-admin queries return empty sets.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  OpportunityFunnel,
  OpportunityKpis,
  OpportunityOpsFlag,
  OpportunityOpsRow,
} from './types';

async function countAll(table: 'quote_requests'): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

async function countOpportunitiesByStatus(status: string): Promise<number> {
  const { count, error } = await supabase
    .from('quote_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', status);
  if (error) throw error;
  return count ?? 0;
}

async function countOpportunitiesByAward(awardStatus: string): Promise<number> {
  const { count, error } = await supabase
    .from('quote_requests')
    .select('id', { count: 'exact', head: true })
    .eq('award_status', awardStatus);
  if (error) throw error;
  return count ?? 0;
}

async function countContractsWithOpportunity(): Promise<number> {
  const { count, error } = await supabase
    .from('contracts')
    .select('id', { count: 'exact', head: true })
    .not('opportunity_id', 'is', null);
  if (error) throw error;
  return count ?? 0;
}

async function distinctAssignedOpportunityIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('quote_request_leads')
    .select('quote_request_id')
    .limit(5000);
  if (error) throw error;
  const out = new Set<string>();
  for (const row of (data ?? []) as Array<{ quote_request_id: string | null }>) {
    if (row.quote_request_id) out.add(row.quote_request_id);
  }
  return out;
}

async function distinctBidOpportunityIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('opportunity_bids')
    .select('opportunity_id')
    .not('opportunity_id', 'is', null)
    .limit(5000);
  if (error) throw error;
  const out = new Set<string>();
  for (const row of (data ?? []) as Array<{ opportunity_id: string | null }>) {
    if (row.opportunity_id) out.add(row.opportunity_id);
  }
  return out;
}

export async function getOpportunityKpis(): Promise<OpportunityKpis> {
  const [
    total,
    newCount,
    underReview,
    awarded,
    cancelled,
    withContract,
    assignedSet,
    bidsSet,
  ] = await Promise.all([
    countAll('quote_requests'),
    countOpportunitiesByStatus('new'),
    countOpportunitiesByStatus('under_review'),
    countOpportunitiesByAward('awarded'),
    countOpportunitiesByStatus('cancelled'),
    countContractsWithOpportunity(),
    distinctAssignedOpportunityIds(),
    distinctBidOpportunityIds(),
  ]);

  return {
    total,
    newCount,
    underReview,
    assigned: assignedSet.size,
    withBids: bidsSet.size,
    awarded,
    withContract,
    cancelled,
  };
}

export async function getOpportunityFunnel(): Promise<OpportunityFunnel> {
  const [submitted, matched, assignedSet, bidsSet, awarded, contracts] =
    await Promise.all([
      countAll('quote_requests'),
      countOpportunitiesByStatus('matched'),
      distinctAssignedOpportunityIds(),
      distinctBidOpportunityIds(),
      countOpportunitiesByAward('awarded'),
      countContractsWithOpportunity(),
    ]);
  return {
    submitted,
    matched,
    assigned: assignedSet.size,
    bids: bidsSet.size,
    awarded,
    contracts,
  };
}

function computeFlag(input: {
  status: string;
  assigned_count: number;
  bid_count: number;
  award_status: string | null;
  contract_id: string | null;
}): OpportunityOpsFlag {
  if (input.status === 'cancelled') return 'cancelled';
  if (input.contract_id) return 'operationally_complete';
  if (input.award_status === 'awarded') return 'awaiting_contract';
  if (input.bid_count > 0) return 'awaiting_award';
  if (input.assigned_count > 0) return 'awaiting_bids';
  return 'needs_matching';
}

/**
 * Latest opportunities with derived ops metrics. Hard-capped page size
 * to keep the request bounded and avoid N+1: counts are bulk-fetched in
 * two extra queries scoped to the page ids.
 */
export async function listOpportunityOpsRows(
  limit = 50,
): Promise<OpportunityOpsRow[]> {
  const safeLimit = Math.max(1, Math.min(limit, 200));
  const { data: rows, error } = await supabase
    .from('quote_requests')
    .select(
      'id, ref_id, customer_name, city, district, sector, status, award_status, awarded_bid_id, awarded_at, created_at, updated_at',
    )
    .order('updated_at', { ascending: false })
    .limit(safeLimit);
  if (error) throw error;

  const ids = (rows ?? []).map((r) => r.id);
  if (ids.length === 0) return [];

  const [{ data: leads, error: lerr }, { data: bids, error: berr }, { data: contracts, error: cerr }] =
    await Promise.all([
      supabase
        .from('quote_request_leads')
        .select('quote_request_id, created_at')
        .in('quote_request_id', ids),
      supabase
        .from('opportunity_bids')
        .select('opportunity_id, created_at, submitted_at')
        .in('opportunity_id', ids),
      supabase
        .from('contracts')
        .select('id, status, opportunity_id, created_at')
        .in('opportunity_id', ids),
    ]);
  if (lerr) throw lerr;
  if (berr) throw berr;
  if (cerr) throw cerr;

  const assignedCount = new Map<string, number>();
  const firstAssignedAt = new Map<string, string>();
  for (const r of (leads ?? []) as Array<{ quote_request_id: string | null; created_at: string | null }>) {
    if (!r.quote_request_id) continue;
    assignedCount.set(
      r.quote_request_id,
      (assignedCount.get(r.quote_request_id) ?? 0) + 1,
    );
    if (r.created_at) {
      const prev = firstAssignedAt.get(r.quote_request_id);
      if (!prev || r.created_at < prev) firstAssignedAt.set(r.quote_request_id, r.created_at);
    }
  }
  const bidCount = new Map<string, number>();
  const firstBidAt = new Map<string, string>();
  for (const r of (bids ?? []) as Array<{ opportunity_id: string | null; created_at: string | null; submitted_at: string | null }>) {
    if (!r.opportunity_id) continue;
    bidCount.set(r.opportunity_id, (bidCount.get(r.opportunity_id) ?? 0) + 1);
    const ts = r.submitted_at ?? r.created_at;
    if (ts) {
      const prev = firstBidAt.get(r.opportunity_id);
      if (!prev || ts < prev) firstBidAt.set(r.opportunity_id, ts);
    }
  }
  const contractByOpp = new Map<string, { id: string; status: string; created_at: string }>();
  for (const c of (contracts ?? []) as Array<{
    id: string;
    status: string;
    opportunity_id: string | null;
    created_at: string;
  }>) {
    if (!c.opportunity_id) continue;
    if (!contractByOpp.has(c.opportunity_id)) {
      contractByOpp.set(c.opportunity_id, { id: c.id, status: c.status, created_at: c.created_at });
    }
  }

  return (rows ?? []).map((r) => {
    const contract = contractByOpp.get(r.id) ?? null;
    const assigned_count = assignedCount.get(r.id) ?? 0;
    const bid_count = bidCount.get(r.id) ?? 0;
    return {
      id: r.id,
      ref_id: r.ref_id ?? null,
      customer_name: r.customer_name ?? null,
      city: r.city ?? null,
      district: r.district ?? null,
      sector: r.sector ?? null,
      status: r.status,
      award_status: r.award_status ?? null,
      awarded_bid_id: r.awarded_bid_id ?? null,
      created_at: r.created_at,
      updated_at: r.updated_at,
      assigned_count,
      bid_count,
      contract_id: contract?.id ?? null,
      contract_status: contract?.status ?? null,
      flag: computeFlag({
        status: r.status,
        assigned_count,
        bid_count,
        award_status: r.award_status ?? null,
        contract_id: contract?.id ?? null,
      }),
      first_assigned_at: firstAssignedAt.get(r.id) ?? null,
      first_bid_at: firstBidAt.get(r.id) ?? null,
      awarded_at: r.awarded_at ?? null,
      contract_created_at: contract?.created_at ?? null,
    };
  });
}

export const __test_only = { computeFlag };
