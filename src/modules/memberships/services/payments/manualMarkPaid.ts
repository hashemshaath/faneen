import { supabase } from '@/integrations/supabase/client';
import { createNotificationFireAndForget } from '@/modules/notifications/services/createNotification';
import { sendTransactionalEmail } from '@/modules/notifications/services/sendTransactionalEmail';
import { getProfileByUserId } from '@/modules/users';
import { getEmailDeliveryAddress } from '@/lib/auth-email';
import type {
  MarkMembershipPaidManuallyInput,
  MarkMembershipPaidManuallyResult,
} from './types';

/**
 * R4F-8D: Admin manual mark-paid wrapper.
 *
 * Calls the SECURITY DEFINER RPC `admin_mark_membership_paid_manually` with
 * the exact named parameters. Returns the raw `{ data, error }` from supabase
 * so callers can inspect either the rpc error or the in-jsonb `{ ok:false }`
 * codes (`payment_intent_not_found`, `duplicate_payment_reference`).
 *
 * On a non-idempotent success the wrapper fires a bilingual in-app
 * notification and a `membership-payment-marked-paid` transactional email.
 * Both side effects are idempotent: notification keyed off the payment intent
 * id, email idempotencyKey `mp-paid-{payment_intent_id}`. Idempotent replays
 * intentionally do NOT re-dispatch either side effect.
 *
 * No live payment provider is wired by this phase — this only formalises the
 * manual / admin confirmation path.
 */
export async function markMembershipPaidManually(
  input: MarkMembershipPaidManuallyInput,
): Promise<{ data: MarkMembershipPaidManuallyResult | null; error: unknown }> {
  const { data, error } = await supabase.rpc(
    'admin_mark_membership_paid_manually',
    {
      p_payment_intent_id: input.paymentIntentId,
      p_admin_user_id: input.adminUserId,
      p_external_payment_id: input.externalPaymentId ?? null,
      p_invoice_id: input.invoiceId ?? null,
      p_paid_at: input.paidAt ?? null,
      p_notes: input.notes ?? null,
    },
  );

  const result = (data ?? null) as unknown as MarkMembershipPaidManuallyResult | null;

  if (!error && result && result.ok && !result.idempotent && result.payment_intent_id) {
    await dispatchManualMarkPaidSideEffects(result);
  }

  return { data: result, error };
}

async function dispatchManualMarkPaidSideEffects(
  result: MarkMembershipPaidManuallyResult,
): Promise<void> {
  const paymentIntentId = result.payment_intent_id!;
  const subscriptionId = result.subscription_id ?? null;

  // Resolve recipient + plan from canonical wrappers' underlying data.
  // We read membership_subscriptions + profiles via the supabase client which
  // is the only side-effect dispatch step in this service. Memberships
  // isolation audit allows reads from this services directory.
  let recipientUserId: string | null = null;
  let recipientEmail: string | null = null;
  let recipientName: string | null = null;
  let planNameEn: string | null = null;
  let planNameAr: string | null = null;
  let amount: number | null = null;
  let currency: string | null = null;
  let invoiceId: string | null = null;

  if (subscriptionId) {
    const { data: sub } = await supabase
      .from('membership_subscriptions')
      .select(
        'user_id, last_paid_amount, last_paid_currency, last_invoice_id, plan:membership_plans!inner(name_ar, name_en)',
      )
      .eq('id', subscriptionId)
      .maybeSingle();
    if (sub) {
      const row = sub as unknown as {
        user_id: string;
        last_paid_amount: number | null;
        last_paid_currency: string | null;
        last_invoice_id: string | null;
        plan?: { name_ar: string | null; name_en: string | null } | null;
      };
      recipientUserId = row.user_id;
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
      // Route through getEmailDeliveryAddress so synthetic phone-login
      // identifiers can never be used as a transactional recipient.
      recipientEmail = getEmailDeliveryAddress({ profileEmail: profile.email });
      recipientName = profile.full_name ?? null;
    }
  }

  if (recipientUserId) {
    createNotificationFireAndForget(
      {
        user_id: recipientUserId,
        title_ar: 'تم تأكيد دفع اشتراك العضوية',
        title_en: 'Membership payment confirmed',
        body_ar: planNameAr
          ? `تم تأكيد دفع اشتراك ${planNameAr} يدوياً من قبل الإدارة.`
          : 'تم تأكيد دفع اشتراك العضوية يدوياً من قبل الإدارة.',
        body_en: planNameEn
          ? `Your ${planNameEn} membership payment was confirmed manually by the admin.`
          : 'Your membership payment was confirmed manually by the admin.',
        notification_type: 'membership_payment_marked_paid',
        reference_type: 'membership_payment_intent',
        reference_id: paymentIntentId,
        action_url: '/membership',
      },
      '[markMembershipPaidManually] notification',
    );
  }

  if (recipientEmail) {
    await sendTransactionalEmail({
      templateName: 'membership-payment-marked-paid',
      recipientEmail,
      idempotencyKey: `mp-paid-${paymentIntentId}`,
      templateData: {
        recipientName,
        planName: planNameEn ?? planNameAr ?? null,
        planNameAr,
        planNameEn,
        paidAt: result.paid_at,
        invoiceId,
        amount,
        currency,
        dashboardUrl: '/membership',
      },
    });
  }
}
