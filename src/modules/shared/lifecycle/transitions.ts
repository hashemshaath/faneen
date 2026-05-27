/**
 * BUSINESS-OPERATIONS-1A — Canonical lifecycle transition tables and
 * pure validator helpers. Additive only — NOT wired into any production
 * mutation yet. Used by audit tests and available for opt-in 1B usage.
 */
import {
  BUSINESS_LIFECYCLE_STATES,
  CONTRACT_LIFECYCLE_STATES,
  LEAD_LIFECYCLE_STATES,
  MODERATION_LIFECYCLE_STATES,
  PAYMENT_INTENT_LIFECYCLE_STATES,
  STAFF_MEMBERSHIP_STATES,
  SUBSCRIPTION_LIFECYCLE_STATES,
  TERMINAL_STATES,
  type BusinessLifecycleState,
  type ContractLifecycleState,
  type LeadLifecycleState,
  type LifecycleDomain,
  type ModerationLifecycleState,
  type PaymentIntentLifecycleState,
  type StaffMembershipState,
  type SubscriptionLifecycleState,
} from './index';

type TransitionMap<S extends string> = Record<S, readonly S[]>;

export const BUSINESS_TRANSITIONS: TransitionMap<BusinessLifecycleState> = {
  draft: ['pending_verification', 'archived'],
  pending_verification: ['verified', 'rejected', 'needs_more_info'],
  needs_more_info: ['pending_verification', 'archived'],
  verified: ['active', 'restricted', 'suspended', 'archived'],
  active: ['restricted', 'suspended', 'archived'],
  restricted: ['active', 'suspended', 'archived'],
  suspended: ['active', 'archived'],
  rejected: ['pending_verification', 'archived'],
  archived: [],
};

export const STAFF_TRANSITIONS: TransitionMap<StaffMembershipState> = {
  invited: ['pending_acceptance', 'expired', 'revoked'],
  pending_acceptance: ['active', 'expired', 'revoked'],
  active: ['disabled', 'revoked'],
  disabled: ['active', 'revoked'],
  revoked: [],
  expired: [],
};

export const LEAD_TRANSITIONS: TransitionMap<LeadLifecycleState> = {
  draft: ['submitted', 'archived'],
  submitted: ['matched', 'spam', 'archived'],
  matched: ['viewed', 'archived', 'spam'],
  viewed: ['contacted', 'lost', 'archived'],
  contacted: ['quoted', 'lost', 'archived'],
  quoted: ['negotiation', 'won', 'lost', 'archived'],
  negotiation: ['won', 'lost', 'archived'],
  won: [],
  lost: ['archived'],
  archived: [],
  spam: [],
};

export const CONTRACT_TRANSITIONS: TransitionMap<ContractLifecycleState> = {
  draft: ['pending_approval', 'cancelled', 'archived'],
  pending_approval: ['partially_signed', 'active', 'cancelled', 'draft'],
  partially_signed: ['active', 'cancelled'],
  active: ['completed', 'cancelled', 'disputed', 'expired'],
  disputed: ['active', 'cancelled', 'completed'],
  completed: ['archived'],
  cancelled: ['archived'],
  expired: ['archived'],
  archived: [],
};

export const SUBSCRIPTION_TRANSITIONS: TransitionMap<SubscriptionLifecycleState> = {
  trial: ['active', 'cancelled', 'expired'],
  active: ['grace_period', 'past_due', 'cancelled', 'expired', 'suspended'],
  grace_period: ['active', 'past_due', 'cancelled', 'expired'],
  past_due: ['active', 'cancelled', 'expired', 'suspended'],
  suspended: ['active', 'cancelled', 'expired'],
  cancelled: [],
  expired: [],
};

export const PAYMENT_INTENT_TRANSITIONS: TransitionMap<PaymentIntentLifecycleState> = {
  created: ['pending', 'expired', 'failed'],
  pending: ['processing', 'paid', 'failed', 'expired'],
  processing: ['paid', 'failed'],
  paid: ['refunded', 'partially_refunded', 'chargeback'],
  partially_refunded: ['refunded', 'chargeback'],
  failed: ['pending'],
  refunded: [],
  chargeback: [],
  expired: [],
};

export const MODERATION_TRANSITIONS: TransitionMap<ModerationLifecycleState> = {
  pending: ['under_review', 'flagged', 'approved', 'rejected'],
  under_review: ['approved', 'rejected', 'flagged'],
  flagged: ['under_review', 'approved', 'rejected'],
  approved: ['appealed'],
  rejected: ['appealed'],
  appealed: ['under_review', 'approved', 'rejected'],
};

export const LIFECYCLE_TRANSITIONS: Record<LifecycleDomain, TransitionMap<string>> = {
  business: BUSINESS_TRANSITIONS as TransitionMap<string>,
  staff: STAFF_TRANSITIONS as TransitionMap<string>,
  lead: LEAD_TRANSITIONS as TransitionMap<string>,
  contract: CONTRACT_TRANSITIONS as TransitionMap<string>,
  subscription: SUBSCRIPTION_TRANSITIONS as TransitionMap<string>,
  payment_intent: PAYMENT_INTENT_TRANSITIONS as TransitionMap<string>,
  moderation: MODERATION_TRANSITIONS as TransitionMap<string>,
};

export const LIFECYCLE_STATES: Record<LifecycleDomain, readonly string[]> = {
  business: BUSINESS_LIFECYCLE_STATES,
  staff: STAFF_MEMBERSHIP_STATES,
  lead: LEAD_LIFECYCLE_STATES,
  contract: CONTRACT_LIFECYCLE_STATES,
  subscription: SUBSCRIPTION_LIFECYCLE_STATES,
  payment_intent: PAYMENT_INTENT_LIFECYCLE_STATES,
  moderation: MODERATION_LIFECYCLE_STATES,
};

/**
 * Returns true if `to` is a documented transition from `from` in `domain`.
 * Returns false for unknown states or self-transitions.
 */
export function canTransition(
  domain: LifecycleDomain,
  from: string,
  to: string,
): boolean {
  if (from === to) return false;
  const table = LIFECYCLE_TRANSITIONS[domain];
  const allowed = table?.[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function isTerminalState(domain: LifecycleDomain, state: string): boolean {
  return TERMINAL_STATES[domain].includes(state);
}