import { supabase } from '@/integrations/supabase/client';

/**
 * Thin read wrappers for legacy provider membership tables
 * `provider_plans` / `provider_subscriptions` (MEMB-7). These remain
 * parallel to the main membership system. No transformation.
 */

export interface ListProviderPlansOptions {
  select?: string;
  activeOnly?: boolean;
}

export async function listProviderPlans<T = unknown>({
  select = 'id, code, name_ar, lead_credits_per_month',
  activeOnly = true,
}: ListProviderPlansOptions = {}): Promise<{ data: T[] | null; error: unknown }> {
  let q = supabase.from('provider_plans').select(select);
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q;
  return { data: data as unknown as T[] | null, error };
}

export interface ListProviderSubscriptionsOptions {
  select?: string;
  limit?: number;
}

export async function listProviderSubscriptions<T = unknown>({
  select = 'id, business_id, provider_user_id, plan_id, status, lead_credits_balance, current_period_start, current_period_end, updated_at, plan:provider_plans(id, code, name_ar, lead_credits_per_month), business:businesses!provider_subscriptions_business_id_fkey(id, name_ar, user_id)',
  limit = 500,
}: ListProviderSubscriptionsOptions = {}): Promise<{ data: T[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from('provider_subscriptions')
    .select(select)
    .order('updated_at', { ascending: false })
    .limit(limit);
  return { data: data as unknown as T[] | null, error };
}

/**
 * Preserves the join select used by `ProviderMembership.tsx`. Orders
 * by `created_at desc` so the first row is the latest subscription.
 */
export interface ListProviderSubscriptionsForUserOptions {
  select?: string;
}

export async function listProviderSubscriptionsForCurrentUser<T = unknown>({
  select = 'id, business_id, status, current_period_start, current_period_end, lead_credits_balance, plan:provider_plans(code, name_ar, description_ar, lead_credits_per_month, monthly_price), business:businesses!provider_subscriptions_business_id_fkey(id, name_ar)',
}: ListProviderSubscriptionsForUserOptions = {}): Promise<{ data: T[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from('provider_subscriptions')
    .select(select)
    .order('created_at', { ascending: false });
  return { data: data as unknown as T[] | null, error };
}

/**
 * Preserves the exact maybeSingle() lookup by `business_id` used by
 * `AdminQuoteRequestDetails.tsx` for reveal-credit display.
 */
export interface GetProviderSubscriptionForBusinessOptions {
  businessId: string;
  select?: string;
}

export async function getProviderSubscriptionForBusiness<T = unknown>({
  businessId,
  select = 'lead_credits_balance, status, plan:provider_plans(name_ar, lead_credits_per_month)',
}: GetProviderSubscriptionForBusinessOptions): Promise<{ data: T | null; error: unknown }> {
  const { data, error } = await supabase
    .from('provider_subscriptions')
    .select(select)
    .eq('business_id', businessId)
    .maybeSingle();
  return { data: data as unknown as T | null, error };
}