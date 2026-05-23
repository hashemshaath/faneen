import { supabase } from '@/integrations/supabase/client';

/**
 * List conversation ids a user participates in.
 * Preserves: `.from('conversations').select('id').or(participant_1.eq.userId,participant_2.eq.userId)`.
 * Returns the raw Supabase response.
 */
export function listConversationIdsForUser({ userId }: { userId: string }) {
  return supabase
    .from('conversations')
    .select('id')
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);
}