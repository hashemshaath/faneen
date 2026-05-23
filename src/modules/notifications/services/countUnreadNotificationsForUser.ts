import { supabase } from '@/integrations/supabase/client';

/**
 * N-2 count wrapper: head+count of unread notifications for a user.
 * Preserves exact filters and `{ count: 'exact', head: true }` options.
 * Returns the raw Supabase result so callers can read `.count` directly.
 */
export function countUnreadNotificationsForUser({ userId }: { userId: string }) {
  return supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
}