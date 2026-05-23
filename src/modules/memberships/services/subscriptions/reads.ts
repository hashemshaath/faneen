import { supabase } from '@/integrations/supabase/client';

/**
 * Thin read wrappers for `membership_subscriptions` (MEMB-2).
 *
 * Returns the raw Supabase data/error so callsites that previously
 * destructured `{ data }` keep working verbatim.
 */

export interface GetCurrentMembershipSubscriptionOptions {
  userId: string;
  select: string;
  /** Statuses to match. Single value uses `.eq`; multiple uses `.in`. */
  statuses?: string[];
}

export async function getCurrentMembershipSubscription<T = unknown>({
  userId,
  select,
  statuses = ['active'],
}: GetCurrentMembershipSubscriptionOptions): Promise<{ data: T | null; error: unknown }> {
  let q = supabase.from('membership_subscriptions').select(select).eq('user_id', userId);
  if (statuses.length === 1) {
    q = q.eq('status', statuses[0]);
  } else {
    q = q.in('status', statuses);
  }
  const { data, error } = await q
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data: data as unknown as T | null, error };
}

/**
 * MEMB-7: Admin list of all membership subscriptions. Preserves
 * exact join select / order / limit used by `AdminMemberships.tsx`.
 */
export interface ListAdminMembershipSubscriptionsOptions {
  select?: string;
  limit?: number;
}

export async function listAdminMembershipSubscriptions<T = unknown>({
  select = '*, plan:membership_plans!plan_id(name_ar, name_en, tier)',
  limit = 500,
}: ListAdminMembershipSubscriptionsOptions = {}): Promise<{ data: T[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from('membership_subscriptions')
    .select(select)
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: data as unknown as T[] | null, error };
}

/**
 * MEMB-7: Count active membership subscriptions (head-only).
 * Preserves the exact `{ count: 'exact', head: true }.eq('status','active')`
 * shape used by `AdminDashboardView.tsx`. Returns the raw response.
 */
export async function countActiveMembershipSubscriptions() {
  return await supabase
    .from('membership_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');
}

/**
 * MEMB-7: Admin usage report RPC wrapper.
 */
export interface AdminListMembershipUsageArgs {
  _only_over_or_near: boolean;
  _limit: number;
}

export async function adminListMembershipUsage(args: AdminListMembershipUsageArgs) {
  const { data, error } = await supabase.rpc('admin_list_membership_usage', args);
  return { data, error };
}