import { supabase } from '@/integrations/supabase/client';

/**
 * N-2 read wrapper for compact "recent notifications" lists on dashboard
 * overviews. Caller supplies the exact select string and limit so that:
 *   - UserDashboardView: 'id, title_ar, title_en, body_ar, body_en, notification_type, is_read, created_at, action_url', limit 5
 *   - ProviderEngagementPreviews: 'id, title_ar, title_en, notification_type, is_read, created_at, action_url', limit 10
 * are both expressible with no behavior change.
 */
export function listRecentNotificationsForUser<T = unknown>({
  userId,
  select,
  limit,
}: {
  userId: string;
  select: string;
  limit: number;
}) {
  return supabase
    .from('notifications')
    .select(select)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<T[]>();
}