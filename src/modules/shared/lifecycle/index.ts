/**
 * BUSINESS-OPERATIONS-1A — Canonical operational lifecycle constants.
 *
 * Additive only. Pure TypeScript. No I/O, no React, no DB calls.
 * The string values are the *target* canonical vocabulary documented in
 * docs/business-operations-lifecycle.md. They are NOT yet enforced against
 * production columns; existing per-domain constants (contract-statuses,
 * quoteStatuses, etc.) continue to be the single source of truth for runtime
 * behavior in this phase.
 */

export const BUSINESS_LIFECYCLE_STATES = [
  'draft',
  'pending_verification',
  'verified',
  'active',
  'restricted',
  'suspended',
  'rejected',
  'needs_more_info',
  'archived',
] as const;
export type BusinessLifecycleState = typeof BUSINESS_LIFECYCLE_STATES[number];

export const STAFF_MEMBERSHIP_STATES = [
  'invited',
  'pending_acceptance',
  'active',
  'disabled',
  'revoked',
  'expired',
] as const;
export type StaffMembershipState = typeof STAFF_MEMBERSHIP_STATES[number];

export const LEAD_LIFECYCLE_STATES = [
  'draft',
  'submitted',
  'matched',
  'viewed',
  'contacted',
  'quoted',
  'negotiation',
  'won',
  'lost',
  'archived',
  'spam',
] as const;
export type LeadLifecycleState = typeof LEAD_LIFECYCLE_STATES[number];

export const CONTRACT_LIFECYCLE_STATES = [
  'draft',
  'pending_approval',
  'partially_signed',
  'active',
  'completed',
  'cancelled',
  'expired',
  'disputed',
  'archived',
] as const;
export type ContractLifecycleState = typeof CONTRACT_LIFECYCLE_STATES[number];

export const SUBSCRIPTION_LIFECYCLE_STATES = [
  'trial',
  'active',
  'grace_period',
  'past_due',
  'cancelled',
  'expired',
  'suspended',
] as const;
export type SubscriptionLifecycleState = typeof SUBSCRIPTION_LIFECYCLE_STATES[number];

export const PAYMENT_INTENT_LIFECYCLE_STATES = [
  'created',
  'pending',
  'processing',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
  'chargeback',
  'expired',
] as const;
export type PaymentIntentLifecycleState = typeof PAYMENT_INTENT_LIFECYCLE_STATES[number];

export const MODERATION_LIFECYCLE_STATES = [
  'pending',
  'under_review',
  'approved',
  'rejected',
  'flagged',
  'appealed',
] as const;
export type ModerationLifecycleState = typeof MODERATION_LIFECYCLE_STATES[number];

export type LifecycleDomain =
  | 'business'
  | 'staff'
  | 'lead'
  | 'contract'
  | 'subscription'
  | 'payment_intent'
  | 'moderation';

/**
 * Terminal states cannot transition further (except via admin overrides
 * that bypass the validator). Documented but not enforced in 1A.
 */
export const TERMINAL_STATES: Record<LifecycleDomain, readonly string[]> = {
  business: ['archived'],
  staff: ['revoked', 'expired'],
  lead: ['won', 'archived', 'spam'],
  contract: ['archived'],
  subscription: ['cancelled', 'expired'],
  payment_intent: ['refunded', 'chargeback', 'expired'],
  moderation: [],
};

export const ACTOR_OWNERS = [
  'system',
  'owner',
  'manager',
  'admin',
  'finance',
  'automation',
] as const;
export type LifecycleActor = typeof ACTOR_OWNERS[number];