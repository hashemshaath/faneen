import { supabase } from '@/integrations/supabase/client';

/**
 * N-2 read wrapper for TrendsWidget: created_at time series.
 * Preserves exact filters and limit.
 */
export function listNotificationCreatedAtSeries({
  userId,
  sinceIso,
  limit = 500,
}: {
  userId: string;
  sinceIso: string;
  limit?: number;
}) {
  return supabase
    .from('notifications')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', sinceIso)
    .limit(limit);
}