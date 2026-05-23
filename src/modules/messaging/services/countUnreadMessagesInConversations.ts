import { supabase } from '@/integrations/supabase/client';

/**
 * Count unread messages within a set of conversation ids that were NOT sent
 * by the viewer. Mirrors ProviderTipsCard's unread-count query exactly.
 */
export function countUnreadMessagesInConversations({
  conversationIds,
  viewerUserId,
}: {
  conversationIds: string[];
  viewerUserId: string;
}) {
  return supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('conversation_id', conversationIds)
    .eq('is_read', false)
    .neq('sender_id', viewerUserId);
}