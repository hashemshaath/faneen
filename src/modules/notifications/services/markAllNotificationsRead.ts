import { supabase } from '@/integrations/supabase/client';

/**
 * N-3 mutation wrapper: mark all unread notifications for a user as read.
 * Preserves exact filters:
 *   update({ is_read: true })
 *     .eq('user_id', userId)
 *     .eq('is_read', false)
 * Returns the raw Supabase result untransformed.
 */
export function markAllNotificationsRead(userId: string) {
  return supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
}