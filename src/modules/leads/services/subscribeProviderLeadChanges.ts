import { supabase } from '@/integrations/supabase/client';

export type ProviderLeadChangeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface ProviderLeadChangeEvent {
  eventType: ProviderLeadChangeEventType;
}

export interface SubscribeProviderLeadChangesParams {
  businessIds: string[];
  onChange: (event: ProviderLeadChangeEvent) => void;
}

/**
 * Subscribe to realtime changes on `lead_requests` for the given business
 * ids. Encapsulates the Supabase channel wiring so dashboard pages do not
 * need to import the Supabase client directly (D4 governance).
 *
 * Returns an unsubscribe function that mirrors the previous inline
 * `supabase.removeChannel(ch)` cleanup. Preserves the original channel
 * naming, filter shape, and event semantics exactly.
 */
export function subscribeProviderLeadChanges({
  businessIds,
  onChange,
}: SubscribeProviderLeadChangesParams): () => void {
  const channel = supabase
    .channel(`provider-leads-${businessIds.join('-').slice(0, 24)}`)
    .on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table: 'lead_requests',
        filter: `business_id=in.(${businessIds.join(',')})`,
      },
      (payload: { eventType: ProviderLeadChangeEventType }) => {
        onChange({ eventType: payload.eventType });
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}