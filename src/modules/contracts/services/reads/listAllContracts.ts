/**
 * CT-2 — Admin-scope list of ALL contracts (no provider/client filter).
 * Supports `count`, `eqStatus`, and `gteCreatedAt` to cover the three
 * AdminDashboardView read shapes:
 *   - full list with `{ count: 'exact' }` for dashboard totals + revenue
 *   - `{ count: 'exact', head: true }` + `gteCreatedAt` for today counters
 *   - `{ count: 'exact', head: true }` + `eqStatus` for pending-approval counters
 * Returns raw Supabase result.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import type { ContractReadResult } from './listContractsForCustomer';

export interface ListAllContractsArgs {
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  count?: { mode: 'exact' | 'planned' | 'estimated'; head?: boolean };
  /** Apply `.eq('status', value)` when provided. */
  eqStatus?: string;
  /** Apply `.gte('created_at', value)` when provided. */
  gteCreatedAt?: string;
}

export async function listAllContracts<TRow = Tables<'contracts'>>(
  args: ListAllContractsArgs = {},
): Promise<ContractReadResult<TRow>> {
  const { select = '*', orderBy, limit, count, eqStatus, gteCreatedAt } = args;
  const selectOpts = count ? { count: count.mode, head: count.head } : undefined;
  let q = supabase.from('contracts').select(select, selectOpts);
  if (eqStatus) q = q.eq('status', eqStatus as Tables<'contracts'>['status']);
  if (gteCreatedAt) q = q.gte('created_at', gteCreatedAt);
  if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true });
  if (typeof limit === 'number') q = q.limit(limit);
  return q as unknown as Promise<ContractReadResult<TRow>>;
}