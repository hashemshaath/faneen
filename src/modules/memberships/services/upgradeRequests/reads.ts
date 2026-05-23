import { supabase } from '@/integrations/supabase/client';

/**
 * Thin read wrappers for `membership_upgrade_requests` (MEMB-4).
 * Returns raw Supabase `{ data, error }`. No transformation.
 */

export interface ListMembershipUpgradeRequestsOptions {
  select: string;
  status?: string;
  orderBy?: { column: string; ascending: boolean };
  limit?: number;
}

export async function listMembershipUpgradeRequests<T = unknown>({
  select,
  status,
  orderBy,
  limit,
}: ListMembershipUpgradeRequestsOptions): Promise<{ data: T[] | null; error: unknown }> {
  let q = supabase.from('membership_upgrade_requests').select(select);
  if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending });
  if (typeof limit === 'number') q = q.limit(limit);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  return { data: (data as unknown as T[] | null), error };
}

export interface FindPendingMembershipUpgradeRequestOptions {
  userId: string;
  businessId: string;
  requestedTier: string;
  select?: string;
}

export async function findPendingMembershipUpgradeRequest<T = unknown>({
  userId,
  businessId,
  requestedTier,
  select = 'id',
}: FindPendingMembershipUpgradeRequestOptions): Promise<{ data: T | null; error: unknown }> {
  const { data, error } = await supabase
    .from('membership_upgrade_requests')
    .select(select)
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .eq('requested_tier', requestedTier)
    .eq('status', 'pending')
    .maybeSingle();
  return { data: (data as unknown as T | null), error };
}

export interface ListMyPendingMembershipUpgradeRequestsOptions {
  userId: string;
  select?: string;
}

export async function listMyPendingMembershipUpgradeRequests<T = unknown>({
  userId,
  select = 'id, requested_tier, status, created_at',
}: ListMyPendingMembershipUpgradeRequestsOptions): Promise<{ data: T[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from('membership_upgrade_requests')
    .select(select)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  return { data: (data as unknown as T[] | null), error };
}