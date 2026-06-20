/**
 * OPPORTUNITIES PHASE 5 — bid services.
 *
 * Thin, fully-typed Supabase calls against `public.opportunity_bids`.
 * RLS enforces who sees / can write what; these helpers never bypass it.
 *
 * No mocks, no fake data, no `any`.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  OpportunityBidRow,
  SubmitOpportunityBidInput,
  UpdateOpportunityBidDraftInput,
} from './types';

/** Client view: all bids on a given opportunity (RLS gates to the owner). */
export async function listOpportunityBidsForClient(
  opportunityId: string,
): Promise<OpportunityBidRow[]> {
  const { data, error } = await supabase
    .from('opportunity_bids')
    .select('*')
    .eq('opportunity_id', opportunityId)
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Provider view: every bid I submitted. */
export async function listMySubmittedBidsForProvider(
  userId: string,
): Promise<OpportunityBidRow[]> {
  const { data, error } = await supabase
    .from('opportunity_bids')
    .select('*')
    .eq('submitted_by', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Provider view: my bid on a specific opportunity (if any). */
export async function getMyBidForOpportunity(
  opportunityId: string,
  userId: string,
): Promise<OpportunityBidRow | null> {
  const { data, error } = await supabase
    .from('opportunity_bids')
    .select('*')
    .eq('opportunity_id', opportunityId)
    .eq('submitted_by', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** Submit a bid in `submitted` state. RLS gates assignment requirement. */
export async function submitOpportunityBid(
  input: SubmitOpportunityBidInput,
): Promise<OpportunityBidRow> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('opportunity_bids')
    .insert({
      opportunity_id: input.opportunityId,
      assignment_id: input.assignmentId ?? null,
      provider_business_id: input.providerBusinessId ?? null,
      submitted_by: input.submittedBy,
      price_amount: input.priceAmount,
      currency: input.currency ?? 'SAR',
      duration_value: input.durationValue ?? null,
      duration_unit: input.durationUnit ?? null,
      scope_summary: input.scopeSummary ?? null,
      terms: input.terms ?? null,
      warranty: input.warranty ?? null,
      status: 'submitted',
      submitted_at: nowIso,
    })
    .select('*')
    .single();
  if (error) throw error;

  // Best-effort owner notification. Failure must not break submission.
  try {
    const { data: opp } = await supabase
      .from('quote_requests')
      .select('user_id, ref_id')
      .eq('id', input.opportunityId)
      .maybeSingle();
    if (opp?.user_id) {
      await supabase.from('notifications').insert({
        user_id: opp.user_id,
        type: 'opportunity_bid_submitted',
        title: 'تم تقديم عرض جديد على فرصتك',
        message: opp.ref_id ? `الفرصة ${opp.ref_id}` : 'تم استلام عرض جديد.',
        related_id: data.id,
        related_type: 'opportunity_bid',
      });
    }
  } catch {
    /* notification is best-effort */
  }

  return data;
}

export async function updateDraftOpportunityBid(
  bidId: string,
  patch: UpdateOpportunityBidDraftInput,
): Promise<OpportunityBidRow> {
  const { data, error } = await supabase
    .from('opportunity_bids')
    .update({
      price_amount: patch.priceAmount ?? undefined,
      currency: patch.currency ?? undefined,
      duration_value: patch.durationValue ?? undefined,
      duration_unit: patch.durationUnit ?? undefined,
      scope_summary: patch.scopeSummary ?? undefined,
      terms: patch.terms ?? undefined,
      warranty: patch.warranty ?? undefined,
    })
    .eq('id', bidId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function withdrawOpportunityBid(
  bidId: string,
): Promise<OpportunityBidRow> {
  const { data, error } = await supabase
    .from('opportunity_bids')
    .update({ status: 'withdrawn' })
    .eq('id', bidId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}