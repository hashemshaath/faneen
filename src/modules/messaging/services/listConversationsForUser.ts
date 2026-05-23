import { supabase } from '@/integrations/supabase/client';

/**
 * Inbox query used by DashboardMessages.
 * When `includeAll` is true (super-admin), skips the participant OR filter
 * to return every conversation. Order is preserved exactly:
 * `.order('last_message_at', { ascending: false })`.
 */
export function listConversationsForUser({
  userId,
  includeAll,
}: {
  userId: string;
  includeAll: boolean;
}) {
  let query = supabase.from('conversations').select('*');
  if (!includeAll) {
    query = query.or(`participant_1.eq.${userId},participant_2.eq.${userId}`);
  }
  return query.order('last_message_at', { ascending: false });
}