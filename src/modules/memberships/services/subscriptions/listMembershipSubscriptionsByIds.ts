import { supabase } from '@/integrations/supabase/client';

/**
 * Wrapper for `supabase.from('membership_subscriptions').select(<select>).in('id', ids)`.
 * Used to enrich event rows in the admin membership events page.
 * Empty input short-circuits to `{ data: [], error: null }`.
 */
export interface ListMembershipSubscriptionsByIdsOptions {
  ids: string[];
  select?: string;
}

export async function listMembershipSubscriptionsByIds<T = unknown>(
  options: ListMembershipSubscriptionsByIdsOptions,
): Promise<{ data: T[] | null; error: unknown }> {
  const { ids, select = 'id, ref_id' } = options;
  if (ids.length === 0) return { data: [] as T[], error: null };
  const { data, error } = await supabase
    .from('membership_subscriptions')
    .select(select)
    .in('id', ids);
  return { data: (data as unknown as T[] | null), error };
}