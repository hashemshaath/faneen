import { supabase } from '@/integrations/supabase/client';

/**
 * Thin read wrappers for `membership_plans` (MEMB-2).
 *
 * Returns the raw Supabase response so callsites that previously
 * destructured `{ data, error }` keep working verbatim. No filters,
 * ordering, or selects are added beyond what callsites specify.
 */

export interface ListActiveMembershipPlansOptions {
  select?: string;
  /** Column to order by ascending; pass `null` to skip ordering. */
  orderBy?: string | null;
  limit?: number;
}

export async function listActiveMembershipPlans<T = unknown>({
  select = '*',
  orderBy = 'sort_order',
  limit,
}: ListActiveMembershipPlansOptions = {}): Promise<{ data: T[] | null; error: unknown }> {
  let q = supabase.from('membership_plans').select(select).eq('is_active', true);
  if (orderBy) q = q.order(orderBy);
  if (typeof limit === 'number') q = q.limit(limit);
  const { data, error } = await q;
  return { data: data as unknown as T[] | null, error };
}