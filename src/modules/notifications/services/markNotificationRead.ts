import { supabase } from '@/integrations/supabase/client';

/**
 * N-3 mutation wrapper: mark a single notification as read.
 * Preserves exact behavior: update({ is_read: true }).eq('id', id).
 * Returns the raw Supabase result untransformed.
 */
export function markNotificationRead(id: string) {
  return supabase.from('notifications').update({ is_read: true }).eq('id', id);
}