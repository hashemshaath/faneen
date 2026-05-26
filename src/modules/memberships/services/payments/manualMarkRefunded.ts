import { supabase } from '@/integrations/supabase/client';
import { createNotificationFireAndForget } from '@/modules/notifications/services/createNotification';
import { sendTransactionalEmail } from '@/modules/notifications/services/sendTransactionalEmail';
import { getProfileByUserId } from '@/modules/users';
import { getEmailDeliveryAddress } from '@/lib/auth-email';
import { getPaymentDisplayReference } from './getPaymentDisplayReference';
import type {
  MarkMembershipRefundedManuallyInput,
  MarkMembershipRefundedManuallyResult,
} from './types';

/**
 * R4F-8H: Admin manual refund / credit-note wrapper.
 *
 * Calls the SECURITY DEFINER RPC
 * `admin_mark_membership_payment_refunded_manually` with the exact named
 * parameters. Returns the raw `{ data, error }` so callers can branch on
 * either the rpc error or the in-jsonb `{ ok:false }` codes
 * (`payment_intent_not_found`, `payment_not_paid`).
 *
 * On a non-idempotent success the wrapper fires a bilingual in-app
 * notification and a `membership-payment-marked-refunded` transactional
 * email. Both side effects are idempotent: notification keyed off the
 * payment intent id, email idempotencyKey `mp-refund-{payment_intent_id}`.
 * Idempotent replays intentionally do NOT re-dispatch either side effect.
 *
 * No payment provider API is called — this only records an admin
 * acknowledgement that the paid intent was refunded or credited manually.
 */
export async function markMembershipRefundedManually(
  input: MarkMembershipRefundedManuallyInput,
): Promise<{ data: MarkMembershipRefundedManuallyResult | null; error: unknown }> {
  const { data, error } = await supabase.rpc(
    'admin_mark_membership_payment_refunded_manually',
    {
      p_payment_intent_id: input.paymentIntentId,
      p_admin_user_id: input.adminUserId,
      p_refund_reference: input.refundReference ?? null,
      p_refunded_at: input.refundedAt ?? null,
      p_notes: input.notes ?? null,
    },
  );

  const result = (data ?? null) as unknown as MarkMembershipRefundedManuallyResult | null;

  if (!error && result && result.ok && !result.idempotent && result.payment_intent_id) {
    await dispatchManualRefundSideEffects(result);
  }

  return { data: result, error };
}

async function dispatchManualRefundSideEffects(
  result: MarkMembershipRefundedManuallyResult,
): Promise<void> {
  const paymentIntentId = result.payment_intent_id!;
  const subscriptionId = result.subscription_id ?? null;

  let recipientUserId: string | null = null;
  let recipientEmail: string | null = null;
  let recipientName: string | null = null;
  let planNameEn: string | null = null;
  let planNameAr: string | null = null;
  let amount: number | null = null;
  let currency: string | null = null;
  let invoiceId: string | null = null;
  let subscriptionRef: string | null = null;

  // BM-REF Step E: surface official PAY ref_id; provider_intent_id stays internal.
  let paymentRef: string | null = null;
  {
    const { data: intentRow } = await supabase
      .from('membership_payment_intents')
      .select('ref_id, provider_intent_id')
      .eq('id', paymentIntentId)
      .maybeSingle();
    paymentRef = getPaymentDisplayReference(
      intentRow as { ref_id: string | null; provider_intent_id: string | null } | null,
    ).primary;
  }

  if (subscriptionId) {
    const { data: sub } = await supabase
      .from('membership_subscriptions')
      .select(
        'user_id, ref_id, last_paid_amount, last_paid_currency, last_invoice_id, plan:membership_plans!inner(name_ar, name_en)',
      )
      .eq('id', subscriptionId)
      .maybeSingle();
    if (sub) {
      const row = sub as unknown as {
        user_id: string;
        ref_id: string | null;
        last_paid_amount: number | null;
        last_paid_currency: string | null;
        last_invoice_id: string | null;
        plan?: { name_ar: string | null; name_en: string | null } | null;
      };
      recipientUserId = row.user_id;
      subscriptionRef = row.ref_id ?? null;
      amount = row.last_paid_amount;
      currency = row.last_paid_currency;
      invoiceId = row.last_invoice_id;
      planNameAr = row.plan?.name_ar ?? null;
      planNameEn = row.plan?.name_en ?? null;
    }
  }

  if (recipientUserId) {
    const { data: profile } = await getProfileByUserId<{
      email: string | null;
      full_name: string | null;
    }>({ userId: recipientUserId, select: 'email, full_name' });
    if (profile) {
      recipientEmail = getEmailDeliveryAddress({ profileEmail: profile.email });
      recipientName = profile.full_name ?? null;
    }
  }

  // BM-REF Step G: prefer /r/{PAY} when official ref_id resolves; fall back
  // to /membership otherwise. Never embed UUID or provider_intent_id in URLs.
  const actionUrl = paymentRef ? `/r/${paymentRef}` : '/membership';

  if (recipientUserId) {
    createNotificationFireAndForget(
      {
        user_id: recipientUserId,
        title_ar: 'تم تسجيل الاسترداد يدويًا',
        title_en: 'Membership payment marked refunded',
        body_ar: planNameAr
          ? `تم تسجيل استرداد دفع اشتراك ${planNameAr} يدويًا من قبل الإدارة.`
          : 'تم تسجيل استرداد دفع اشتراك العضوية يدويًا من قبل الإدارة.',
        body_en: planNameEn
          ? `Your ${planNameEn} membership payment was marked as refunded manually by the admin.`
          : 'Your membership payment was marked as refunded manually by the admin.',
        notification_type: 'membership_payment_marked_refunded',
        reference_type: 'membership_payment_intent',
        reference_id: paymentIntentId,
        action_url: actionUrl,
      },
      '[markMembershipRefundedManually] notification',
    );
  }

  if (recipientEmail) {
    await sendTransactionalEmail({
      templateName: 'membership-payment-marked-refunded',
      recipientEmail,
      idempotencyKey: `mp-refund-${paymentIntentId}`,
      templateData: {
        recipientName,
        planName: planNameEn ?? planNameAr ?? null,
        planNameAr,
        planNameEn,
        refundedAt: result.refunded_at,
        invoiceId,
        paymentRef,
        subscriptionRef,
        amount,
        currency,
        dashboardUrl: actionUrl,
      },
    });
  }
}