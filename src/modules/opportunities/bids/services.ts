/**
 * OPPORTUNITIES PHASE 5 — bid services.
 *
 * Thin, fully-typed Supabase calls against `public.opportunity_bids`.
 * RLS enforces who sees / can write what; these helpers never bypass it.
 *
 * No mocks, no fake data, no `any`.
 */
import { supabase } from '@/integrations/supabase/client';
import { createNotification } from '@/modules/notifications';
import type {
  OpportunityBidRow,
  SubmitOpportunityBidInput,
  UpdateOpportunityBidDraftInput,
} from './types';

/**
 * R1 — Toggle shortlist state on a bid (client/admin action).
 * shortlisted=true  → status 'shortlisted'
 * shortlisted=false → status 'under_review'
 * Also emits an audit event and a best-effort provider notification.
 */
export async function setBidShortlisted(
  bidId: string,
  shortlisted: boolean,
): Promise<OpportunityBidRow> {
  const next = shortlisted ? 'shortlisted' : 'under_review';
  const patch: { status: string; shortlisted_at?: string | null } = { status: next };
  if (shortlisted) patch.shortlisted_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('opportunity_bids')
    .update(patch)
    .eq('id', bidId)
    .select('*')
    .single();
  if (error) throw error;

  // Best-effort audit event.
  try {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from('quote_request_events').insert({
      quote_request_id: data.opportunity_id,
      event_type: shortlisted ? 'bid.shortlisted' : 'bid.unshortlisted',
      actor_user_id: auth?.user?.id ?? null,
      metadata: { bid_id: bidId },
    });
  } catch {
    /* best-effort audit */
  }

  // Best-effort provider notification (only on positive shortlist).
  try {
    if (data?.submitted_by && shortlisted) {
      await createNotification({
        user_id: data.submitted_by,
        notification_type: 'opportunity_bid_shortlisted',
        title_ar: 'تم إدراج عرضك في القائمة القصيرة',
        title_en: 'Your bid has been shortlisted',
        body_ar: 'العميل أدرج عرضك ضمن القائمة القصيرة للمقارنة النهائية.',
        body_en: 'The client shortlisted your bid for final comparison.',
        reference_id: data.id,
        reference_type: 'opportunity_bid',
      });
    }
  } catch {
    /* best-effort */
  }
  return data;
}

/**
 * R1 — Fan out polite-decline in-app notifications to every losing
 * bidder after the award RPC flips them to `rejected`. Idempotent enough
 * for our purposes — one notification per unique losing submitter.
 */
export async function notifyLosingBiddersAfterAward(
  opportunityId: string,
  winningBidId: string,
  opts?: { refId?: string | null },
): Promise<number> {
  const { data: losers, error } = await supabase
    .from('opportunity_bids')
    .select('id, submitted_by')
    .eq('opportunity_id', opportunityId)
    .neq('id', winningBidId)
    .eq('status', 'rejected');
  if (error || !losers?.length) return 0;

  const uniqueUsers = Array.from(
    new Set(losers.map((b) => b.submitted_by).filter(Boolean)),
  ) as string[];
  const refSuffix = opts?.refId ? ` (${opts.refId})` : '';
  await Promise.allSettled(
    uniqueUsers.map((uid) =>
      createNotification({
        user_id: uid,
        notification_type: 'opportunity_bid_declined',
        title_ar: 'شكراً لتقديم عرضك',
        title_en: 'Thank you for your bid',
        body_ar: `تم اختيار عرض آخر لهذه الفرصة${refSuffix}. نقدّر مشاركتك ونرحّب بك في الفرص القادمة.`,
        body_en: `Another bid was selected for this opportunity${refSuffix}. We appreciate your participation and welcome you on upcoming opportunities.`,
        reference_id: opportunityId,
        reference_type: 'opportunity',
      }),
    ),
  );
  return uniqueUsers.length;
}

/**
 * R1 — Persist award reason in the RFQ audit trail (no schema change).
 * Stored as an event on `quote_request_events` — column `award_reason`
 * will land in R2 as a proper field.
 */
export async function recordAwardReason(
  opportunityId: string,
  bidId: string,
  reason: string,
): Promise<void> {
  const trimmed = reason.trim();
  if (!trimmed) return;
  // R2: also persist on the quote request itself (owner/admin RLS only).
  try {
    await supabase
      .from('quote_requests')
      .update({ award_reason: trimmed })
      .eq('id', opportunityId);
  } catch {
    /* best-effort — the event log below is the source of truth */
  }
  const { data: auth } = await supabase.auth.getUser();
  await supabase.from('quote_request_events').insert({
    quote_request_id: opportunityId,
    event_type: 'rfq.award_reason_set',
    actor_user_id: auth?.user?.id ?? null,
    metadata: { bid_id: bidId, reason: trimmed },
  });
}

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
      payment_terms: input.paymentTerms ?? null,
      valid_until: input.validUntil ?? null,
      vat_inclusive: input.vatInclusive ?? true,
      materials_brand_ids: input.materialsBrandIds ?? null,
      price_breakdown: (input.priceBreakdown ?? []) as unknown as never,
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
      await createNotification({
        user_id: opp.user_id,
        notification_type: 'opportunity_bid_submitted',
        title_ar: 'تم تقديم عرض جديد على فرصتك',
        title_en: 'A new bid was submitted on your opportunity',
        body_ar: opp.ref_id ? `الفرصة ${opp.ref_id}` : 'تم استلام عرض جديد.',
        body_en: opp.ref_id ? `Opportunity ${opp.ref_id}` : 'A new bid has been received.',
        reference_id: data.id,
        reference_type: 'opportunity_bid',
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
      payment_terms: patch.paymentTerms ?? undefined,
      valid_until: patch.validUntil ?? undefined,
      vat_inclusive: patch.vatInclusive ?? undefined,
      materials_brand_ids: patch.materialsBrandIds ?? undefined,
      price_breakdown: patch.priceBreakdown
        ? (patch.priceBreakdown as unknown as never)
        : undefined,
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

/**
 * PHASE 6 — Award a winning bid on an opportunity.
 * Runs transactionally inside the `award_opportunity_bid` RPC.
 * Only the opportunity owner or an admin may execute it; providers
 * are rejected by the function itself.
 */
export async function awardOpportunityBid(
  opportunityId: string,
  bidId: string,
  opts?: { awardReason?: string | null },
): Promise<string> {
  const { data, error } = await supabase.rpc('award_opportunity_bid', {
    p_opportunity_id: opportunityId,
    p_bid_id: bidId,
  });
  if (error) throw error;
  // R2: stamp award_reason + closed_at on the opportunity (owner/admin RLS).
  try {
    const patch: { closed_at: string; award_reason?: string } = {
      closed_at: new Date().toISOString(),
    };
    const trimmed = opts?.awardReason?.trim();
    if (trimmed) patch.award_reason = trimmed;
    await supabase.from('quote_requests').update(patch).eq('id', opportunityId);
  } catch {
    /* best-effort */
  }
  return (data as string) ?? bidId;
}

/**
 * R2 — Record a polite decline reason for a specific losing bid.
 * Visible only to the bidder themselves + provider staff + client + admin
 * per existing opportunity_bids RLS. Idempotent overwrite.
 */
export async function setBidDeclineReason(
  bidId: string,
  reason: string,
): Promise<void> {
  const trimmed = reason.trim();
  if (!trimmed) return;
  await supabase
    .from('opportunity_bids')
    .update({ decline_reason: trimmed })
    .eq('id', bidId);
}