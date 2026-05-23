import { supabase } from '@/integrations/supabase/client';

/**
 * N-2 count wrapper: head+count of notifications created on/after `sinceIso`.
 * Used by TodaySummary for the today-notifications KPI.
 */
export function countNotificationsForUserSince({
  userId,
  sinceIso,
}: {
  userId: string;
  sinceIso: string;
}) {
  return supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', sinceIso);
}