// WRAPPER-ISOLATION-BACKLOG-1: canonical server-side membership table
// helpers. All edge functions MUST go through this module to read or
// mutate `membership_subscriptions` / `membership_plans`. See
// `scripts/edge-memberships-isolation-audit.mjs`.
//
// Each helper is intentionally thin and preserves the exact shape used by
// the original inline query so no behavior changes.

// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

/** Look up a single membership subscription by id. */
export async function getMembershipSubscriptionById(
  admin: SupabaseClient,
  id: string,
  select: string,
) {
  return await admin
    .from('membership_subscriptions')
    .select(select)
    .eq('id', id)
    .maybeSingle();
}

/** Look up a single membership plan by id. */
export async function getMembershipPlanById(
  admin: SupabaseClient,
  id: string,
  select: string,
) {
  return await admin
    .from('membership_plans')
    .select(select)
    .eq('id', id)
    .maybeSingle();
}

/**
 * Find the most recent reusable pending subscription for the given
 * user/plan/cycle, scoped to a business id or unscoped (`business_id IS
 * NULL`). Mirrors the exact two-branch query used by
 * `membership-payment-create-intent`.
 */
export async function findReusablePendingMembershipSubscription(
  admin: SupabaseClient,
  args: {
    userId: string;
    planId: string;
    billingCycle: string;
    businessId: string | null;
    select: string;
    limit?: number;
  },
) {
  const { userId, planId, billingCycle, businessId, select, limit = 1 } = args;
  const base = admin
    .from('membership_subscriptions')
    .select(select)
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .eq('billing_cycle', billingCycle)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit);
  return businessId
    ? await base.eq('business_id', businessId)
    : await base.is('business_id', null);
}

/** Insert a membership subscription and return the chosen projection. */
export async function insertMembershipSubscription(
  admin: SupabaseClient,
  row: Record<string, unknown>,
  select: string,
) {
  return await admin
    .from('membership_subscriptions')
    .insert(row)
    .select(select)
    .maybeSingle();
}

/** Patch arbitrary fields on a membership subscription row. */
export async function updateMembershipSubscriptionById(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
) {
  return await admin
    .from('membership_subscriptions')
    .update(patch)
    .eq('id', id);
}