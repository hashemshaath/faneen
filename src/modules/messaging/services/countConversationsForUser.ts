import { supabase } from '@/integrations/supabase/client';

/**
 * Count conversations a user participates in (participant_1 OR participant_2).
 * Preserves: `.from('conversations').select('id', { count: 'exact', head: true }).or(...)`.
 * Returns the raw Supabase response so callers can use `.count`.
 */
export function countConversationsForUser({ userId }: { userId: string }) {
  return supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);
}