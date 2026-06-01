import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for admin reports / KPI queries that read `profiles`
 * filtered by a `created_at` ISO range.
 *
 * - Table: `profiles`
 * - Filter: `created_at >= fromIso AND created_at <= toIso`
 * - Select: caller-controlled; default `'id,created_at'`
 * - Order: optional `{ column, ascending }` (defaults to no extra order)
 * - Limit: optional row cap
 * - Returns raw `{ data, error }`; never throws.
 */
export interface ListProfilesByCreatedRangeOptions {
  fromIso: string;
  toIso: string;
  select?: string;
  order?: { column: string; ascending: boolean };
  limit?: number;
}

export async function listProfilesByCreatedRange<T = unknown>(
  options: ListProfilesByCreatedRangeOptions,
): Promise<{ data: T[] | null; error: unknown }> {
  const { fromIso, toIso, select = 'id,created_at', order, limit } = options;
  let q = supabase
    .from('profiles')
    .select(select)
    .gte('created_at', fromIso)
    .lte('created_at', toIso);
  if (order) q = q.order(order.column, { ascending: order.ascending });
  if (typeof limit === 'number') q = q.limit(limit);
  const { data, error } = await q;
  return { data: data as unknown as T[] | null, error };
}