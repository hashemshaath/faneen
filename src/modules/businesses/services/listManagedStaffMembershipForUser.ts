import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for owner/manager staff-membership list reads:
 *
 *   supabase.from('business_staff')
 *     .select(<select>)
 *     .eq('user_id', userId)
 *     .eq('is_active', true)
 *     .in('role', ['owner', 'manager'])
 *     [.limit(n)?]
 *
 * Returns the raw `{ data, error }` shape (data is array | null).
 * Never throws; never transforms rows.
 *
 * Future replacement target for: Membership, DashboardContractAnalytics.
 */
export interface ListManagedStaffMembershipForUserOptions {
  userId: string;
  select: string;
  limit?: number;
}

export async function listManagedStaffMembershipForUser<T = unknown>(
  options: ListManagedStaffMembershipForUserOptions,
): Promise<{ data: T[] | null; error: unknown }> {
  const { userId, select, limit } = options;
  let query = supabase
    .from('business_staff')
    .select(select)
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('role', ['owner', 'manager']);
  if (typeof limit === 'number') query = query.limit(limit);
  const { data, error } = await query;
  return { data: (data as unknown as T[] | null), error };
}