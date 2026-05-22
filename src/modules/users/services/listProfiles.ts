import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for `supabase.from('profiles').select(<select>).order(...).limit(...)`.
 *
 * - Table: `profiles`
 * - Select: caller-controlled; default `'*'`
 * - OrderBy: optional `{ column, ascending? }` (ascending defaults to true, matching PostgREST)
 * - Limit: optional row cap
 * - Returns raw Supabase `{ data, error }`; never throws
 */
export interface ListProfilesOptions {
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
}

export async function listProfiles<T = unknown>(
  options: ListProfilesOptions = {},
): Promise<{ data: T[] | null; error: unknown }> {
  const { select = '*', orderBy, limit } = options;
  let query = supabase.from('profiles').select(select);
  if (orderBy) {
    query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
  }
  if (typeof limit === 'number') {
    query = query.limit(limit);
  }
  const { data, error } = await query;
  return { data: (data as unknown as T[] | null), error };
}