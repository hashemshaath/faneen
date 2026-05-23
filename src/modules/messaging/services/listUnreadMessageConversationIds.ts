import { supabase } from '@/integrations/supabase/client';

/**
 * List `conversation_id` for every unread message NOT sent by the viewer.
 * Source of truth for unread-by-conversation aggregation used by
 * ProviderEngagementPreviews and DashboardMessages.
 * Preserves: `.from('messages').select('conversation_id').eq('is_read', false).neq('sender_id', userId)`.
 */
export function listUnreadMessageConversationIds({ userId }: { userId: string }) {
  return supabase
    .from('messages')
    .select('conversation_id')
    .eq('is_read', false)
    .neq('sender_id', userId);
}