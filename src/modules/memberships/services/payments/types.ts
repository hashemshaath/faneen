/**
 * R4F-8C: Provider-agnostic membership payment types.
 *
 * These types are scaffolding for future payment integrations.
 * No live provider is wired in this phase.
 */

export type MembershipPaymentProvider =
  | 'manual'
  | 'promo'
  | 'stripe'
  | 'paddle'
  | 'tap'
  | 'hyperpay'
  | 'moyasar'
  | 'other';

export type MembershipPaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'manual'
  | 'cancelled';

export type MembershipPaymentIntentStatus =
  | 'created'
  | 'requires_action'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export interface CreateMembershipPaymentIntentInput {
  subscriptionId: string;
  planId: string;
  userId: string;
  businessId?: string | null;
  provider: MembershipPaymentProvider;
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export interface ConfirmMembershipPaymentInput {
  intentId: string;
  provider: MembershipPaymentProvider;
  providerIntentId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ReconcileMembershipPaymentStatusInput {
  subscriptionId?: string;
  intentId?: string;
  provider: MembershipPaymentProvider;
  providerIntentId?: string;
}

export interface MarkMembershipPaidManuallyInput {
  /** R4F-8D: payment intent to mark as paid. */
  paymentIntentId: string;
  /** Admin user id; must match auth.uid() if supplied. */
  adminUserId: string;
  /** Provider/external payment reference (maps to provider_intent_id). */
  externalPaymentId?: string | null;
  /** Invoice id (maps to invoice_id). */
  invoiceId?: string | null;
  /** Paid timestamp (defaults server-side to now()). */
  paidAt?: string | null;
  /** Admin free-text note, stored under metadata.manual_mark_paid.notes. */
  notes?: string | null;
}

export interface MarkMembershipPaidManuallyResult {
  ok: boolean;
  idempotent?: boolean;
  code?: 'payment_intent_not_found' | 'duplicate_payment_reference';
  payment_intent_id?: string;
  subscription_id?: string;
  status?: 'paid';
  paid_at?: string;
}