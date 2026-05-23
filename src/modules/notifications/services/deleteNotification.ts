import { supabase } from '@/integrations/supabase/client';

/**
 * N-3 mutation wrapper: delete a single notification by id.
 * Preserves exact behavior: delete().eq('id', id).
 * Returns the raw Supabase result untransformed.
 */
export function deleteNotification(id: string) {
  return supabase.from('notifications').delete().eq('id', id);
}