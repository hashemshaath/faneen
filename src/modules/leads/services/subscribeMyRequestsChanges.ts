import { supabase } from '@/integrations/supabase/client';

export type MyRequestsChangeSource = 'lead_requests' | 'quote_requests';

export interface SubscribeMyRequestsChangesParams {
  userId: string;
  onLeadChange: () => void;
  onQuoteChange: () => void;
}

/**
 * Subscribe to realtime changes on the current customer's lead_requests
 * and quote_requests rows. Encapsulates the Supabase realtime wiring so
 * `DashboardMyRequests` does not need to import the Supabase client
 * directly (D4 governance). Preserves the previous channel naming,
 * filter shape, and event semantics exactly.
 */
export function subscribeMyRequestsChanges({
  userId,
  onLeadChange,
  onQuoteChange,
}: SubscribeMyRequestsChangesParams): () => void {
  const channel = supabase
    .channel(`my-requests-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'lead_requests', filter: `user_id=eq.${userId}` },
      () => { onLeadChange(); },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'quote_requests', filter: `user_id=eq.${userId}` },
      () => { onQuoteChange(); },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}