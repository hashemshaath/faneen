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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type IdentityTokenMap = Record<string, string>;

const QUERY_KEY = ['admin-identity-tokens', 'global'] as const;

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
    const channel = supabase
      .channel('admin_identity_tokens_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_identity_tokens' },
        () => {
          qc.invalidateQueries({ queryKey: QUERY_KEY });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  return {
    tokens: query.data?.tokens ?? {},
    id: query.data?.id ?? null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
