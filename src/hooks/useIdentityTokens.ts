/**
 * ADMIN-REDESIGN PHASE 2 — Identity Center tokens hook.
 *
 * Reads the single `global` row from `admin_identity_tokens` and
 * subscribes to realtime updates so any change in the Identity Center
 * propagates to every open admin/dashboard tab without reload.
 *
 * The returned `tokens` object maps CSS variable names (incl. the leading
 * `--`) to raw values (HSL triplets, px strings, etc.). It is consumed
 * by `<IdentityTokensApplier />` and `AdminIdentityCenter`.
 */
import { useEffect } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type IdentityTokenMap = Record<string, string>;

const QUERY_KEY = ['admin-identity-tokens', 'global'] as const;

type IdentityRealtimeChannel = ReturnType<typeof supabase.channel>;

let identityRealtimeChannel: IdentityRealtimeChannel | null = null;
let identityRealtimeSubscribers = 0;
const identityQueryClients = new Map<QueryClient, number>();

const createIdentityChannelName = () => {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return `qitaat_identity_tokens_${suffix}`;
};

const invalidateIdentityTokens = () => {
  identityQueryClients.forEach((_count, client) => {
    void client.invalidateQueries({ queryKey: QUERY_KEY });
  });
};

const subscribeToIdentityTokens = (client: QueryClient) => {
  identityRealtimeSubscribers += 1;
  identityQueryClients.set(client, (identityQueryClients.get(client) ?? 0) + 1);

  if (!identityRealtimeChannel) {
    identityRealtimeChannel = supabase
      .channel(createIdentityChannelName())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_identity_tokens' },
        invalidateIdentityTokens,
      );
    identityRealtimeChannel.subscribe();
  }

  return () => {
    const currentClientCount = identityQueryClients.get(client) ?? 0;
    if (currentClientCount <= 1) identityQueryClients.delete(client);
    else identityQueryClients.set(client, currentClientCount - 1);

    identityRealtimeSubscribers = Math.max(0, identityRealtimeSubscribers - 1);
    if (identityRealtimeSubscribers === 0 && identityRealtimeChannel) {
      const channel = identityRealtimeChannel;
      identityRealtimeChannel = null;
      void supabase.removeChannel(channel);
    }
  };
};

export function useIdentityTokens() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<{ id: string | null; tokens: IdentityTokenMap }> => {
      const { data, error } = await supabase
        .from('admin_identity_tokens')
        .select('id, tokens')
        .eq('scope', 'global')
        .maybeSingle();
      if (error) throw error;
      const raw = (data?.tokens ?? {}) as Record<string, unknown>;
      const tokens: IdentityTokenMap = {};
      for (const [k, v] of Object.entries(raw)) {
        if (typeof v === 'string' && k.startsWith('--')) tokens[k] = v;
      }
      return { id: data?.id ?? null, tokens };
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    return subscribeToIdentityTokens(qc);
  }, [qc]);

  return {
    tokens: query.data?.tokens ?? {},
    id: query.data?.id ?? null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
