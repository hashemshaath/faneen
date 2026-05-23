import { supabase } from '@/integrations/supabase/client';

/**
 * M-4 realtime wrapper for the global conversations channel listened to by
 * the DashboardMessages inbox list.
 *
 * Preserves the original subscription exactly:
 *   supabase
 *     .channel('conversations-list')
 *     .on('postgres_changes',
 *         { event: '*', schema: 'public', table: 'conversations' },
 *         onChange)
 *     .subscribe();
 *
 * Returns a cleanup function that calls `supabase.removeChannel(channel)`,
 * matching the original useEffect teardown.
 */
export function subscribeUserConversations({
  onChange,
}: {
  onChange: () => void;
}): () => void {
  const channel = supabase
    .channel('conversations-list')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'conversations' },
      () => {
        onChange();
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}