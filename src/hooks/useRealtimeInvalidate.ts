import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribe to Postgres changes on a table and invalidate the provided
 * react-query keys whenever an INSERT/UPDATE/DELETE arrives. Pass
 * `enabled: false` to pause the live stream.
 */
export function useRealtimeInvalidate(opts: {
  channel: string;
  table: string;
  schema?: string;
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  queryKeys: ReadonlyArray<ReadonlyArray<unknown>>;
  enabled?: boolean;
}): void {
  const qc = useQueryClient();
  const { channel, table, schema = 'public', event = '*', enabled = true } = opts;
  // Stable string key for the queryKeys list so we re-subscribe only on real change.
  const keysSignature = JSON.stringify(opts.queryKeys);

  useEffect(() => {
    if (!enabled) return;
    const sub = supabase
      .channel(channel)
      // @ts-expect-error -- postgres_changes payload typing is loose on supabase-js v2.
      .on('postgres_changes', { event, schema, table }, () => {
        for (const k of opts.queryKeys) {
          qc.invalidateQueries({ queryKey: k as unknown[] });
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, table, schema, event, enabled, keysSignature, qc]);
}