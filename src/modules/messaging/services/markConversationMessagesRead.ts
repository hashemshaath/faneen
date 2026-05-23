import { supabase } from '@/integrations/supabase/client';

/**
 * M-3 mutation wrapper for marking the current viewer's inbound messages as read.
 *
 * Preserves DashboardMessages mark-as-read behavior exactly:
 *   supabase.from('messages')
 *     .update({ is_read: true })
 *     .eq('conversation_id', conversationId)
 *     .neq('sender_id', viewerUserId)
 *     .eq('is_read', false)
 *
 * Returns the raw PostgrestFilterBuilder so callers can `.then(...)` (fail-soft)
 * exactly as before. No broadening of filters.
 */
export function markConversationMessagesRead({
  conversationId,
  viewerUserId,
}: {
  conversationId: string;
  viewerUserId: string;
}) {
  return supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', viewerUserId)
    .eq('is_read', false);
}