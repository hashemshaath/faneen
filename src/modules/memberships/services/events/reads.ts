import { supabase } from '@/integrations/supabase/client';

/**
 * Thin read wrapper for `membership_subscription_events` (MEMB-4).
 */

export interface ListRecentMembershipSubscriptionEventsOptions {
  select?: string;
  limit?: number;
}

export async function listRecentMembershipSubscriptionEvents<T = unknown>({
  select = '*',
  limit = 500,
}: ListRecentMembershipSubscriptionEventsOptions = {}): Promise<{ data: T[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from('membership_subscription_events')
    .select(select)
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: (data as unknown as T[] | null), error };
}