/**
 * Phase E — RFQ cancellation services.
 *
 * Two flavors:
 *   1. Pre-award (`cancelRfqPreAward`) — client cancels freely; all providers
 *      holding open leads are notified via the existing
 *      `opportunity-cancelled-provider` email template.
 *   2. Post-award cancellation request (`createPostAwardCancellationRequest`
 *      + `respondToCancellationRequest`) — client requests, awarded provider
 *      accepts / rejects / refers to penalty terms.
 *
 * RLS enforces who can call what. These helpers never bypass it.
 */
import { supabase } from '@/integrations/supabase/client';
import { createNotification } from '@/modules/notifications';
import { sendTransactionalEmail } from '@/modules/notifications/services/sendTransactionalEmail';
import { getBusinessProviderContactForEmail } from '@/modules/businesses/services/getBusinessProviderContactForEmail';

const SITE_BASE = 'https://qitaat.com';

/* -------------------------------------------------------------------------- */
/*  Pre-award cancellation                                                     */
/* -------------------------------------------------------------------------- */

export interface CancelRfqPreAwardInput {
  quoteRequestId: string;
  reason?: string | null;
}

export async function cancelRfqPreAward(input: CancelRfqPreAwardInput): Promise<void> {
  const { quoteRequestId, reason } = input;

  // Guarded update: only cancel if still open and NOT awarded.
  const { data: updated, error } = await supabase
    .from('quote_requests')
    .update({ status: 'cancelled' })
    .eq('id', quoteRequestId)
    .is('awarded_bid_id', null)
    .in('status', ['new', 'under_review', 'matched', 'contacted', 'expired'])
    .select('id, ref_id, user_id')
    .maybeSingle();

  if (error) throw error;
  if (!updated) {
    throw new Error('لا يمكن إلغاء هذا الطلب — إما أنه تمت الترسية أو أنه مغلق بالفعل.');
  }

  // Audit event.
  await supabase.from('quote_request_events').insert({
    quote_request_id: quoteRequestId,
    event_type: 'quote.cancelled',
    metadata: { reason: reason ?? null, phase: 'pre_award' },
  });

  // Fan-out to providers that have OPEN leads on this RFQ.
  const { data: leads } = await supabase
    .from('quote_request_leads')
    .select('provider_id, provider_user_id, status')
    .eq('quote_request_id', quoteRequestId);

  const openLeads = ((leads ?? []) as unknown as Array<{ provider_id: string | null; provider_user_id: string | null; status: string | null }>).filter(
    (l) => !['closed', 'rejected', 'cancelled', 'lost'].includes(String(l?.status ?? '')),
  );

  const seenBiz = new Set<string>();
  for (const l of openLeads) {
    const businessId = l.provider_id;
    if (!businessId || seenBiz.has(businessId)) continue;
    seenBiz.add(businessId);

    // In-app: provider user gets a notification.
    if (l.provider_user_id) {
      try {
        await createNotification({
          user_id: l.provider_user_id,
          notification_type: 'opportunity_cancelled',
          title_ar: 'تم إلغاء الفرصة',
          title_en: 'Opportunity cancelled',
          body_ar: updated.ref_id ? `الفرصة ${updated.ref_id} أُلغيت من قِبل العميل.` : 'تم إلغاء الفرصة من قِبل العميل.',
          body_en: updated.ref_id ? `Opportunity ${updated.ref_id} was cancelled by the client.` : 'The opportunity was cancelled by the client.',
          reference_type: 'quote_request',
          reference_id: quoteRequestId,
        });
      } catch { /* best-effort */ }
    }

    // Email: use existing opportunity-cancelled-provider template.
    try {
      const { providerEmail, businessName } = await getBusinessProviderContactForEmail({
        businessId,
      });
      if (providerEmail) {
        await sendTransactionalEmail({
          templateName: 'opportunity-cancelled-provider',
          recipientEmail: providerEmail,
          idempotencyKey: `opp-cancelled-${quoteRequestId}-${businessId}`,
          templateData: {
            ref: updated.ref_id ?? quoteRequestId,
            businessName,
            reason: reason ?? undefined,
            url: `${SITE_BASE}/dashboard/opportunities/${quoteRequestId}`,
          },
        });
      }
    } catch { /* best-effort */ }
  }

  // Close open leads at DB level (best-effort — RLS may prevent, that's ok).
  try {
    await supabase
      .from('quote_request_leads')
      .update({ status: 'closed' })
      .eq('quote_request_id', quoteRequestId)
      .not('status', 'in', '(closed,rejected,cancelled,lost)');
  } catch { /* best-effort */ }
}

/* -------------------------------------------------------------------------- */
/*  Post-award cancellation request                                            */
/* -------------------------------------------------------------------------- */

export interface CreatePostAwardCancellationRequestInput {
  quoteRequestId: string;
  reason: string;
}

export interface RfqCancellationRequestRow {
  id: string;
  quote_request_id: string;
  requested_by: string;
  reason: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  provider_response: string | null;
  penalty_note: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
}

export async function createPostAwardCancellationRequest(
  input: CreatePostAwardCancellationRequestInput,
): Promise<RfqCancellationRequestRow> {
  const trimmed = (input.reason ?? '').trim();
  if (!trimmed) throw new Error('سبب طلب الإلغاء مطلوب.');

  const { data: authData } = await supabase.auth.getUser();
  const uid = authData?.user?.id;
  if (!uid) throw new Error('غير مسجّل الدخول.');

  const { data, error } = await supabase
    .from('rfq_cancellation_requests')
    .insert({
      quote_request_id: input.quoteRequestId,
      requested_by: uid,
      reason: trimmed,
      status: 'pending',
    })
    .select('*')
    .single();
  if (error) throw error;

  // Notify awarded provider staff via user notifications.
  try {
    const { data: qr } = await supabase
      .from('quote_requests')
      .select('id, ref_id, awarded_provider_business_id')
      .eq('id', input.quoteRequestId)
      .maybeSingle();
    const bizId = (qr as { awarded_provider_business_id?: string | null } | null)?.awarded_provider_business_id ?? null;
    if (bizId) {
      const { data: staff } = await supabase
        .from('business_staff')
        .select('user_id')
        .eq('business_id', bizId)
        .eq('is_active', true);
      for (const s of (staff ?? []) as Array<{ user_id: string | null }>) {
        if (!s.user_id) continue;
        try {
          await createNotification({
            user_id: s.user_id,
            notification_type: 'rfq_cancellation_requested',
            title_ar: 'طلب إلغاء تعاقد من العميل',
            title_en: 'Client requested contract cancellation',
            body_ar: (qr as { ref_id?: string | null } | null)?.ref_id
              ? `الفرصة ${(qr as { ref_id?: string | null }).ref_id} — طلب إلغاء التعاقد بحاجة لردّك.`
              : 'طلب إلغاء تعاقد بحاجة لردّك.',
            body_en: 'A cancellation request is awaiting your response.',
            reference_type: 'quote_request',
            reference_id: input.quoteRequestId,
          });
        } catch { /* best-effort */ }
      }
    }
  } catch { /* best-effort */ }

  return data as unknown as RfqCancellationRequestRow;
}

export interface RespondToCancellationRequestInput {
  requestId: string;
  decision: 'accepted' | 'rejected';
  providerResponse?: string | null;
  penaltyNote?: string | null;
}

export async function respondToCancellationRequest(
  input: RespondToCancellationRequestInput,
): Promise<RfqCancellationRequestRow> {
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData?.user?.id;
  if (!uid) throw new Error('غير مسجّل الدخول.');

  const { data, error } = await supabase
    .from('rfq_cancellation_requests')
    .update({
      status: input.decision,
      provider_response: input.providerResponse ?? null,
      penalty_note: input.penaltyNote ?? null,
      responded_by: uid,
      responded_at: new Date().toISOString(),
    })
    .eq('id', input.requestId)
    .eq('status', 'pending')
    .select('*')
    .single();
  if (error) throw error;
  const row = data as unknown as RfqCancellationRequestRow;

  // If accepted → cancel the RFQ (keep awarded_bid_id as history per policy).
  if (input.decision === 'accepted') {
    await supabase
      .from('quote_requests')
      .update({ status: 'cancelled' })
      .eq('id', row.quote_request_id);

    await supabase.from('quote_request_events').insert({
      quote_request_id: row.quote_request_id,
      event_type: 'quote.cancellation_accepted',
      actor_user_id: uid,
      metadata: { cancellation_request_id: row.id },
    });
  } else {
    await supabase.from('quote_request_events').insert({
      quote_request_id: row.quote_request_id,
      event_type: 'quote.cancellation_rejected',
      actor_user_id: uid,
      metadata: {
        cancellation_request_id: row.id,
        penalty_note: row.penalty_note ?? null,
      },
    });
  }

  // Notify the client.
  try {
    const { data: qr } = await supabase
      .from('quote_requests')
      .select('id, ref_id, user_id')
      .eq('id', row.quote_request_id)
      .maybeSingle();
    const clientUid = (qr as { user_id?: string | null } | null)?.user_id ?? null;
    if (clientUid) {
      const isAccept = input.decision === 'accepted';
      await createNotification({
        user_id: clientUid,
        notification_type: isAccept ? 'rfq_cancellation_accepted' : 'rfq_cancellation_rejected',
        title_ar: isAccept ? 'تم قبول طلب إلغاء التعاقد' : 'تم رفض طلب إلغاء التعاقد',
        title_en: isAccept ? 'Cancellation request accepted' : 'Cancellation request rejected',
        body_ar: (qr as { ref_id?: string | null } | null)?.ref_id
          ? `الفرصة ${(qr as { ref_id?: string | null }).ref_id}${row.penalty_note ? ` — ملاحظة جزائية: ${row.penalty_note}` : ''}`
          : row.provider_response ?? '',
        body_en: row.provider_response ?? undefined,
        reference_type: 'quote_request',
        reference_id: row.quote_request_id,
      });
    }
  } catch { /* best-effort */ }

  return row;
}

export async function listCancellationRequestsForRfq(
  quoteRequestId: string,
): Promise<RfqCancellationRequestRow[]> {
  const { data, error } = await supabase
    .from('rfq_cancellation_requests')
    .select('*')
    .eq('quote_request_id', quoteRequestId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as RfqCancellationRequestRow[];
}