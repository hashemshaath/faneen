import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch all messages for a conversation in ascending chronological order.
 * Preserves: `.from('messages').select('*').eq('conversation_id', id).order('created_at', { ascending: true })`.
 */
export function listMessagesForConversation({ conversationId }: { conversationId: string }) {
  return supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
}