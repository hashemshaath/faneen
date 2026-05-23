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