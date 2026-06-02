// R4F-9E: Shared server helpers for Moyasar membership payment
// reconciliation. Used by the webhook, confirm, and reconcile edge
// functions to keep status transitions and side effects identical and
// idempotent regardless of trigger.
//
// Strict invariants:
//   - Never trusts client-supplied status.
//   - Provider state is fetched server-side via MOYASAR_SECRET_KEY.
//   - State transitions are gated by SQL `WHERE status IN (...)` so only
//     one caller observes `transitioned=true` per change.
//   - Side effects (notification + transactional email) only fire when
//     a real transition occurred — duplicate webhooks / confirm polls
//     never fan out twice.
//   - Email uses deterministic idempotency key `mp-<terminal>-<intentId>`.

// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  getMembershipPlanById,
  updateMembershipSubscriptionById,
} from '../memberships/queries.ts';

export type InternalIntentStatus =
  | 'created'
  | 'requires_action'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export type MoyasarStatus =
  | 'initiated'
  | 'paid'
  | 'failed'
  | 'authorized'
  | 'captured'
  | 'voided'
  | 'expired'
  | 'refunded'
  | (string & {});

export interface ProviderPaymentSnapshot {
  status: InternalIntentStatus | null;
  rawStatus: string | null;
  amount: number | null;
  currency: string | null;
  failureMessage: string | null;
  paidAt: string | null;
  invoiceId: string | null;
  paymentId: string | null;
  raw: any;
}

export interface TransitionResult {
  transitioned: boolean;
  fromStatus: InternalIntentStatus | null;
  toStatus: InternalIntentStatus | null;
  intentId: string;
  subscriptionId: string;
}

/* ────────────────────────── Status mapping ─────────────────────────── */

export function mapMoyasarStatusToInternal(
  s: string | null | undefined,
): InternalIntentStatus | null {
  if (!s) return null;
  const v = s.trim().toLowerCase();
  switch (v) {
    case 'paid':
    case 'captured':
      return 'succeeded';
    case 'failed':
      return 'failed';
    case 'voided':
    case 'expired':
    case 'canceled':
    case 'cancelled':
      return 'cancelled';
    case 'refunded':
      return 'refunded';
    case 'initiated':
    case 'authorized':
      return 'requires_action';
    default:
      return null;
  }
}

// Allowed prior statuses keyed by the target terminal status.
const ALLOWED_FROM: Record<InternalIntentStatus, InternalIntentStatus[]> = {
  created: [],
  requires_action: ['created'],
  succeeded: ['created', 'requires_action'],
  failed: ['created', 'requires_action'],
  cancelled: ['created', 'requires_action'],
  refunded: ['succeeded'],
};

/* ──────────────────── Subscription period helpers ──────────────────── */

/**
 * MEMBERSHIP-PAYMENT-ACTIVATION-1: compute the new `expires_at` for a
 * membership subscription based on its billing cycle. Pure + side-effect
 * free so it can be unit-tested without DB access.
 *
 * Rules:
 *   - monthly  → +1 calendar month from the anchor
 *   - yearly / annual → +1 calendar year from the anchor
 *   - anything else → null (caller preserves existing expiry)
 *
 * Renewal vs first activation:
 *   - If `currentExpiresAt` is in the future, the new period is anchored
 *     to that expiry (true renewal extends the existing window).
 *   - Otherwise, the new period is anchored to `startAt` (or now()).
 */
export function computeMembershipPeriodEnd(args: {
  billingCycle: string | null | undefined;
  startAt: Date;
  currentExpiresAt?: Date | null;
  now?: Date;
}): Date | null {
  const cycle = (args.billingCycle ?? '').trim().toLowerCase();
  const now = args.now ?? new Date();
  const anchor =
    args.currentExpiresAt && args.currentExpiresAt.getTime() > now.getTime()
      ? new Date(args.currentExpiresAt)
      : new Date(args.startAt);

  const end = new Date(anchor);
  if (cycle === 'monthly') {
    end.setUTCMonth(end.getUTCMonth() + 1);
    return end;
  }
  if (cycle === 'yearly' || cycle === 'annual') {
    end.setUTCFullYear(end.getUTCFullYear() + 1);
    return end;
  }
  return null;
}

/* ────────────────────────── Provider fetch ─────────────────────────── */

export async function fetchMoyasarPaymentStatus(args: {
  providerIntentId: string;
  secretKey: string;
}): Promise<{ ok: true; snapshot: ProviderPaymentSnapshot } | { ok: false; code: string }> {
  const { providerIntentId, secretKey } = args;
  if (!providerIntentId) return { ok: false, code: 'missing_provider_intent_id' };
  if (!secretKey) return { ok: false, code: 'missing_payment_config' };
  const auth = `Basic ${btoa(`${secretKey}:`)}`;

  // Try invoice endpoint first (we create hosted invoices in R4F-9C).
  const candidates = [
    `https://api.moyasar.com/v1/invoices/${encodeURIComponent(providerIntentId)}`,
    `https://api.moyasar.com/v1/payments/${encodeURIComponent(providerIntentId)}`,
  ];
  let raw: any = null;
  let lastError: string | null = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers: { Authorization: auth } });
      if (res.status === 404) continue;
      if (!res.ok) {
        lastError = `provider_http_${res.status}`;
        continue;
      }
      raw = await res.json();
      break;
    } catch {
      lastError = 'provider_network_error';
    }
  }
  if (!raw) return { ok: false, code: lastError ?? 'provider_not_found' };

  // Moyasar invoice payload exposes `status` and (when paid) latest `payments[0]`.
  const latestPayment = Array.isArray(raw.payments) && raw.payments.length > 0
    ? raw.payments[raw.payments.length - 1]
    : null;
  const rawStatus =
    (typeof raw.status === 'string' ? raw.status : null) ??
    (latestPayment?.status as string | undefined) ??
    null;

  const amountMinor =
    typeof latestPayment?.amount === 'number'
      ? latestPayment.amount
      : typeof raw.amount === 'number'
        ? raw.amount
        : null;
  const currency =
    (typeof raw.currency === 'string' ? raw.currency : null) ??
    (typeof latestPayment?.currency === 'string' ? latestPayment.currency : null);

  const snapshot: ProviderPaymentSnapshot = {
    status: mapMoyasarStatusToInternal(rawStatus),
    rawStatus,
    amount: amountMinor != null ? amountMinor / 100 : null,
    currency: currency ? String(currency).toUpperCase() : null,
    failureMessage:
      typeof latestPayment?.source?.message === 'string'
        ? latestPayment.source.message
        : typeof raw.source?.message === 'string'
          ? raw.source.message
          : null,
    paidAt:
      typeof latestPayment?.created_at === 'string' ? latestPayment.created_at : null,
    invoiceId: typeof raw.id === 'string' ? raw.id : null,
    paymentId: typeof latestPayment?.id === 'string' ? latestPayment.id : null,
    raw,
  };
  return { ok: true, snapshot };
}

/* ─────────────────────── Intent state transitions ──────────────────── */

export interface IntentRow {
  id: string;
  subscription_id: string;
  user_id: string;
  status: InternalIntentStatus;
  amount: number;
  currency: string;
  provider: string;
  provider_intent_id: string | null;
  plan_id: string | null;
  billing_cycle: string | null;
  business_id: string | null;
}

export async function loadIntent(
  admin: SupabaseClient,
  intentId: string,
): Promise<IntentRow | null> {
  const { data } = await admin
    .from('membership_payment_intents')
    .select(
      'id, subscription_id, user_id, status, amount, currency, provider, provider_intent_id, plan_id, billing_cycle, business_id',
    )
    .eq('id', intentId)
    .maybeSingle();
  return (data as IntentRow | null) ?? null;
}

export async function reconcileIntentWithProvider(args: {
  admin: SupabaseClient;
  intent: IntentRow;
  snapshot: ProviderPaymentSnapshot;
}): Promise<TransitionResult> {
  const { admin, intent, snapshot } = args;
  const target = snapshot.status;
  if (!target) {
    return {
      transitioned: false,
      fromStatus: intent.status,
      toStatus: null,
      intentId: intent.id,
      subscriptionId: intent.subscription_id,
    };
  }

  // Currency/amount sanity check on terminal transitions.
  if (target === 'succeeded' || target === 'refunded') {
    if (snapshot.currency && snapshot.currency !== intent.currency) {
      return await markFailureMismatch(admin, intent, 'currency_mismatch');
    }
    if (
      snapshot.amount != null &&
      Number(snapshot.amount).toFixed(2) !== Number(intent.amount).toFixed(2)
    ) {
      return await markFailureMismatch(admin, intent, 'amount_mismatch');
    }
  }

  const allowedFrom = ALLOWED_FROM[target] ?? [];
  if (allowedFrom.length === 0) {
    return noop(intent);
  }

  const update: Record<string, unknown> = {
    status: target,
    updated_at: new Date().toISOString(),
  };
  if (target === 'succeeded') {
    update.confirmed_at = snapshot.paidAt ?? new Date().toISOString();
    if (snapshot.invoiceId) update.invoice_id = snapshot.invoiceId;
    if (snapshot.paymentId && !intent.provider_intent_id) {
      update.provider_intent_id = snapshot.paymentId;
    }
    update.failure_reason = null;
  } else if (target === 'failed') {
    update.failure_reason = snapshot.failureMessage ?? snapshot.rawStatus ?? 'failed';
  } else if (target === 'cancelled') {
    update.failure_reason = snapshot.rawStatus ?? 'cancelled';
  }

  const { data: updated, error } = await admin
    .from('membership_payment_intents')
    .update(update)
    .eq('id', intent.id)
    .in('status', allowedFrom)
    .select('id, status')
    .maybeSingle();
  if (error || !updated) {
    return noop(intent);
  }

  // Mirror onto membership_subscriptions for terminal success/refund only.
  if (target === 'succeeded') {
    await activateSubscriptionOnPaymentSuccess({
      admin,
      intent,
      snapshot,
    });
  } else if (target === 'refunded') {
    await updateMembershipSubscriptionById(admin, intent.subscription_id, {
      payment_status: 'refunded',
      updated_at: new Date().toISOString(),
    });
  }

  return {
    transitioned: true,
    fromStatus: intent.status,
    toStatus: target,
    intentId: intent.id,
    subscriptionId: intent.subscription_id,
  };
}

/**
 * MEMBERSHIP-PAYMENT-ACTIVATION-1
 *
 * Apply payment-success mirror fields AND activate the underlying
 * membership subscription so the tier-sync trigger fan-out fires
 * (`trg_membership_subscriptions_sync_tier`).
 *
 * Invariants:
 *   - Idempotent through `reconcileIntentWithProvider`: this helper only
 *     runs once per intent transition because the intent guard already
 *     prevents duplicate `succeeded` transitions.
 *   - Does NOT directly write `businesses.membership_tier` or
 *     `profiles.membership_tier` — the DB trigger owns those mirrors.
 *   - Plan must be active; if a plan was hidden/deactivated between
 *     intent creation and confirmation we still record the payment but
 *     leave the subscription in its current lifecycle state.
 *   - `starts_at` is preserved if it already existed; otherwise set to
 *     payment paid-at (or now()).
 *   - `expires_at` is computed from billing cycle. Renewals extend from
 *     the existing `expires_at` when still in the future; otherwise the
 *     new period anchors at `starts_at`.
 *   - `cancelled_at` is cleared on activation (reactivation flow).
 */
async function activateSubscriptionOnPaymentSuccess(args: {
  admin: SupabaseClient;
  intent: IntentRow;
  snapshot: ProviderPaymentSnapshot;
}) {
  const { admin, intent, snapshot } = args;
  const nowIso = new Date().toISOString();
  const paidAtIso = snapshot.paidAt ?? nowIso;

  const basePatch: Record<string, unknown> = {
    payment_provider: 'moyasar',
    payment_status: 'paid',
    last_paid_at: paidAtIso,
    last_paid_amount: intent.amount,
    last_paid_currency: intent.currency,
    last_invoice_id: snapshot.invoiceId,
    last_external_payment_id: snapshot.paymentId,
    renewal_failure_count: 0,
    payment_failure_reason: null,
    updated_at: nowIso,
  };

  // Load current subscription + plan activeness to compute activation
  // safely. We tolerate read failures and degrade to a mirror-only
  // update so the payment never appears "lost".
  const { data: subRow } = await admin
    .from('membership_subscriptions')
    .select('id, status, starts_at, expires_at, plan_id, billing_cycle')
    .eq('id', intent.subscription_id)
    .maybeSingle();

  if (!subRow) {
    await updateMembershipSubscriptionById(admin, intent.subscription_id, basePatch);
    return;
  }

  let planActive = true;
  if (subRow.plan_id) {
    const { data: planRow } = await getMembershipPlanById(
      admin,
      subRow.plan_id as string,
      'is_active',
    );
    if (planRow && (planRow as { is_active?: boolean }).is_active === false) {
      planActive = false;
    }
  }

  if (!planActive) {
    // Inactive plan — record payment but never auto-activate. Admin
    // tooling will resolve manually.
    await updateMembershipSubscriptionById(admin, intent.subscription_id, {
      ...basePatch,
      payment_failure_reason: 'plan_inactive',
    });
    return;
  }

  const startAt =
    subRow.starts_at && String(subRow.starts_at).length > 0
      ? new Date(subRow.starts_at as string)
      : new Date(paidAtIso);
  const currentExpires = subRow.expires_at
    ? new Date(subRow.expires_at as string)
    : null;
  const cycle =
    (subRow.billing_cycle as string | null) ?? intent.billing_cycle ?? null;

  const newExpires = computeMembershipPeriodEnd({
    billingCycle: cycle,
    startAt,
    currentExpiresAt: currentExpires,
  });

  const activationPatch: Record<string, unknown> = {
    ...basePatch,
    status: 'active',
    starts_at: startAt.toISOString(),
    cancelled_at: null,
    grace_period_until: null,
  };
  if (newExpires) {
    activationPatch.expires_at = newExpires.toISOString();
  } else if (currentExpires) {
    // Preserve existing expiry when cycle is unknown.
    activationPatch.expires_at = currentExpires.toISOString();
  }

  await updateMembershipSubscriptionById(
    admin,
    intent.subscription_id,
    activationPatch,
  );
}

function noop(intent: IntentRow): TransitionResult {
  return {
    transitioned: false,
    fromStatus: intent.status,
    toStatus: null,
    intentId: intent.id,
    subscriptionId: intent.subscription_id,
  };
}

async function markFailureMismatch(
  admin: SupabaseClient,
  intent: IntentRow,
  reason: 'amount_mismatch' | 'currency_mismatch',
): Promise<TransitionResult> {
  const { data } = await admin
    .from('membership_payment_intents')
    .update({
      status: 'failed',
      failure_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', intent.id)
    .in('status', ALLOWED_FROM.failed)
    .select('id')
    .maybeSingle();
  return {
    transitioned: Boolean(data),
    fromStatus: intent.status,
    toStatus: data ? 'failed' : null,
    intentId: intent.id,
    subscriptionId: intent.subscription_id,
  };
}

/* ──────────────────────── Side effect dispatch ─────────────────────── */

interface PlanLite {
  name_ar: string | null;
  name_en: string | null;
}
interface RecipientLite {
  email: string | null;
  full_name: string | null;
}

async function loadPlanAndRecipient(admin: SupabaseClient, intent: IntentRow) {
  let plan: PlanLite = { name_ar: null, name_en: null };
  if (intent.plan_id) {
    const { data } = await getMembershipPlanById(admin, intent.plan_id, 'name_ar, name_en');
    if (data) plan = data as PlanLite;
  }
  let recipient: RecipientLite = { email: null, full_name: null };
  const { data: profile } = await admin
    .from('profiles')
    .select('email, full_name')
    .eq('user_id', intent.user_id)
    .maybeSingle();
  if (profile) recipient = profile as RecipientLite;
  return { plan, recipient };
}

export async function dispatchPaymentSucceededSideEffects(args: {
  admin: SupabaseClient;
  supabaseUrl: string;
  serviceRoleKey: string;
  intent: IntentRow;
}) {
  const { admin, supabaseUrl, serviceRoleKey, intent } = args;
  const { plan, recipient } = await loadPlanAndRecipient(admin, intent);

  // Notification — service role insert (allowed inside edge functions).
  try {
    await admin.from('notifications').insert({
      user_id: intent.user_id,
      title_ar: 'تم تأكيد دفع اشتراك العضوية',
      title_en: 'Membership payment confirmed',
      body_ar: plan.name_ar
        ? `تم تأكيد دفع اشتراك ${plan.name_ar} بنجاح.`
        : 'تم تأكيد دفع اشتراك العضوية بنجاح.',
      body_en: plan.name_en
        ? `Your ${plan.name_en} membership payment was confirmed.`
        : 'Your membership payment was confirmed.',
      notification_type: 'membership_payment_succeeded',
      reference_type: 'membership_payment_intent',
      reference_id: intent.id,
      action_url: '/dashboard/membership',
    });
  } catch (_) { /* fail-soft */ }

  // Email — call send-transactional-email with deterministic idempotency key.
  if (recipient.email) {
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
        body: JSON.stringify({
          templateName: 'membership-payment-marked-paid',
          recipientEmail: recipient.email,
          idempotencyKey: `mp-succeeded-${intent.id}`,
          templateData: {
            recipientName: recipient.full_name,
            planName: plan.name_en ?? plan.name_ar ?? null,
            planNameAr: plan.name_ar,
            planNameEn: plan.name_en,
            amount: intent.amount,
            currency: intent.currency,
            dashboardUrl: '/dashboard/membership',
          },
        }),
      });
    } catch (_) { /* fail-soft */ }
  }
}

export async function dispatchPaymentRefundedSideEffects(args: {
  admin: SupabaseClient;
  supabaseUrl: string;
  serviceRoleKey: string;
  intent: IntentRow;
}) {
  const { admin, supabaseUrl, serviceRoleKey, intent } = args;
  const { plan, recipient } = await loadPlanAndRecipient(admin, intent);
  try {
    await admin.from('notifications').insert({
      user_id: intent.user_id,
      title_ar: 'تم استرداد دفع اشتراك العضوية',
      title_en: 'Membership payment refunded',
      body_ar: 'تم استرداد دفع اشتراك العضوية الخاص بك.',
      body_en: 'Your membership payment was refunded.',
      notification_type: 'membership_payment_refunded',
      reference_type: 'membership_payment_intent',
      reference_id: intent.id,
      action_url: '/dashboard/membership',
    });
  } catch (_) { /* fail-soft */ }
  if (recipient.email) {
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
        body: JSON.stringify({
          templateName: 'membership-payment-marked-refunded',
          recipientEmail: recipient.email,
          idempotencyKey: `mp-refunded-${intent.id}`,
          templateData: {
            recipientName: recipient.full_name,
            planName: plan.name_en ?? plan.name_ar ?? null,
            planNameAr: plan.name_ar,
            planNameEn: plan.name_en,
            amount: intent.amount,
            currency: intent.currency,
            dashboardUrl: '/dashboard/membership',
          },
        }),
      });
    } catch (_) { /* fail-soft */ }
  }
}

/**
 * High-level: given an intent + a provider snapshot, transition + dispatch
 * side effects atomically. Caller is responsible for fetching the snapshot.
 */
export async function applyProviderSnapshot(args: {
  admin: SupabaseClient;
  supabaseUrl: string;
  serviceRoleKey: string;
  intent: IntentRow;
  snapshot: ProviderPaymentSnapshot;
}): Promise<TransitionResult> {
  const result = await reconcileIntentWithProvider({
    admin: args.admin,
    intent: args.intent,
    snapshot: args.snapshot,
  });
  if (result.transitioned && result.toStatus === 'succeeded') {
    await dispatchPaymentSucceededSideEffects({
      admin: args.admin,
      supabaseUrl: args.supabaseUrl,
      serviceRoleKey: args.serviceRoleKey,
      intent: args.intent,
    });
  } else if (result.transitioned && result.toStatus === 'refunded') {
    await dispatchPaymentRefundedSideEffects({
      admin: args.admin,
      supabaseUrl: args.supabaseUrl,
      serviceRoleKey: args.serviceRoleKey,
      intent: args.intent,
    });
  }
  return result;
}