import { supabase } from '@/integrations/supabase/client';

/**
 * M-4 realtime wrapper for the per-conversation messages INSERT channel.
 *
 * Preserves the DashboardMessages subscription exactly:
 *   supabase
 *     .channel(`messages-${conversationId}`)
 *     .on('postgres_changes',
 *         { event: 'INSERT', schema: 'public', table: 'messages',
 *           filter: `conversation_id=eq.${conversationId}` },
 *         onInsert)
 *     .subscribe();
 *
 * Returns a cleanup function that calls `supabase.removeChannel(channel)`,
 * matching the original useEffect teardown.
 */
export function subscribeConversationMessages({
  conversationId,
  onInsert,
}: {
  conversationId: string;
  onInsert: () => void;
}): () => void {
  const channel = supabase
    .channel(`messages-${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      () => {
        onInsert();
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;
  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}