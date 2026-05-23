import { supabase } from '@/integrations/supabase/client';

/**
 * List the most-recently-active conversations for a user with the meta
 * columns ProviderEngagementPreviews needs.
 * Preserves the exact select, OR participant filter, order, and limit.
 */
export function listRecentConversationsForUser({
  userId,
  limit,
}: {
  userId: string;
  limit: number;
}) {
  return supabase
    .from('conversations')
    .select('id, participant_1, participant_2, last_message_at, updated_at')
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(limit);
}