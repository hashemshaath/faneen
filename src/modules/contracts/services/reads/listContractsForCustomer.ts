/**
 * CT-2 — List contracts where `client_id = clientId`.
 * Returns raw Supabase result. Caller controls select/order/limit/count
 * exactly as before migration.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export interface ListContractsForCustomerArgs {
  clientId: string;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  count?: { mode: 'exact' | 'planned' | 'estimated'; head?: boolean };
}

export async function listContractsForCustomer<TRow = Tables<'contracts'>>(
  args: ListContractsForCustomerArgs,
) {
  const { clientId, select = '*', orderBy, limit, count } = args;
  const selectOpts = count ? { count: count.mode, head: count.head } : undefined;
  let q = (supabase as unknown as {
    from: (t: string) => {
      select: (s: string, o?: unknown) => {
        eq: (c: string, v: string) => {
          order: (c: string, o: { ascending: boolean }) => unknown;
          limit: (n: number) => unknown;
          then: unknown;
        };
      };
    };
  })
    .from('contracts')
    .select(select, selectOpts)
    .eq('client_id', clientId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q2 = q as any;
  if (orderBy) q2 = q2.order(orderBy.column, { ascending: orderBy.ascending ?? true });
  if (typeof limit === 'number') q2 = q2.limit(limit);
  return q2 as Promise<{
    data: TRow[] | null;
    error: { message: string } | null;
    count: number | null;
  }>;
}
