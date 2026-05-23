import { supabase } from '@/integrations/supabase/client';

/**
 * N-2 read wrapper for LiveActivityWidget: most recent notifications with
 * preview fields. Preserves exact select, order, and limit.
 */
export function listLiveActivityNotifications({
  userId,
  limit = 15,
}: {
  userId: string;
  limit?: number;
}) {
  return supabase
    .from('notifications')
    .select('id, title_ar, title_en, body_ar, body_en, action_url, is_read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
}