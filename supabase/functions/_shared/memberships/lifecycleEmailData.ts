// R4F-5: Membership lifecycle email data helpers.
//
// Lives under `_shared/memberships/` so it is the only place in the edge
// runtime that may directly query the guarded membership tables
// (per edge-memberships-isolation-audit). The dispatcher imports from here
// rather than touching `membership_subscriptions` / `membership_plans` /
// `membership_promo_codes` directly.

// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export interface LifecycleSubscriptionContext {
  subscription_id: string;
  user_id: string;
  business_id: string | null;
  status: string;
  expires_at: string | null;
  grace_period_until: string | null;
  plan_tier: string | null;
  plan_name_ar: string | null;
  plan_name_en: string | null;
  downgrade_to_tier: string | null;
}

export async function fetchLifecycleSubscriptionContext(
  admin: SupabaseClient,
  subscriptionId: string,
): Promise<LifecycleSubscriptionContext | null> {
  const { data, error } = await admin
    .from('membership_subscriptions')
    .select(
      'id, user_id, business_id, status, expires_at, grace_period_until, downgrade_to_tier, plan:membership_plans!inner(tier, name_ar, name_en)',
    )
    .eq('id', subscriptionId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as any;
  return {
    subscription_id: row.id,
    user_id: row.user_id,
    business_id: row.business_id ?? null,
    status: row.status,
    expires_at: row.expires_at ?? null,
    grace_period_until: row.grace_period_until ?? null,
    plan_tier: row.plan?.tier ?? null,
    plan_name_ar: row.plan?.name_ar ?? null,
    plan_name_en: row.plan?.name_en ?? null,
    downgrade_to_tier: row.downgrade_to_tier ?? null,
  };
}

export interface PromoRedemptionContext {
  redemption_id: string;
  user_id: string;
  business_id: string | null;
  applied_subscription_id: string | null;
  created_at: string;
  promo_code: string;
  target_tier: string | null;
  duration_days: number | null;
}

export async function fetchRecentPromoRedemptions(
  admin: SupabaseClient,
  sinceIso: string,
  limit = 200,
): Promise<PromoRedemptionContext[]> {
  const { data, error } = await admin
    .from('membership_promo_redemptions')
    .select(
      'id, user_id, business_id, applied_subscription_id, created_at, code:membership_promo_codes!inner(code, target_tier, duration_days)',
    )
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as any[]).map((row) => ({
    redemption_id: row.id,
    user_id: row.user_id,
    business_id: row.business_id ?? null,
    applied_subscription_id: row.applied_subscription_id ?? null,
    created_at: row.created_at,
    promo_code: row.code?.code ?? '',
    target_tier: row.code?.target_tier ?? null,
    duration_days: row.code?.duration_days ?? null,
  }));
}
