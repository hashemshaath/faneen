import { supabase } from '@/integrations/supabase/client';

/**
 * Count all messages sent by a given user.
 * Preserves: `.from('messages').select('id', { count: 'exact', head: true }).eq('sender_id', userId)`.
 */
export function countMessagesBySender({ userId }: { userId: string }) {
  return supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('sender_id', userId);
}