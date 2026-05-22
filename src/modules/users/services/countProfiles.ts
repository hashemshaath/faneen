import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for `supabase.from('profiles').select(<select>, { count: 'exact', head: true })`.
 *
 * - Table: `profiles`
 * - Select: caller-controlled column expression; default `'id'`
 * - Always uses `{ count: 'exact', head: true }` — head-only count probe
 * - Filters: optional sequential `eq` / `gte` / `lte` filters preserved in order
 * - Returns the raw Supabase `{ data, error, count }` shape; never throws
 */
export type CountProfilesFilter =
  | { column: string; op: 'eq' | 'gte' | 'lte'; value: unknown };

export interface CountProfilesOptions {
  select?: string;
  filters?: CountProfilesFilter[];
}

export async function countProfiles(
  options: CountProfilesOptions = {},
): Promise<{ data: unknown; error: unknown; count: number | null }> {
  const { select = 'id', filters = [] } = options;
  type AnyFilterable = {
    eq: (c: string, v: unknown) => AnyFilterable;
    gte: (c: string, v: unknown) => AnyFilterable;
    lte: (c: string, v: unknown) => AnyFilterable;
    then: <R>(onFulfilled: (v: { data: unknown; error: unknown; count: number | null }) => R) => Promise<R>;
  };
  let query = supabase
    .from('profiles')
    .select(select, { count: 'exact', head: true }) as unknown as AnyFilterable;
  for (const f of filters) {
    if (f.op === 'eq') query = query.eq(f.column, f.value);
    else if (f.op === 'gte') query = query.gte(f.column, f.value);
    else if (f.op === 'lte') query = query.lte(f.column, f.value);
  }
  const { data, error, count } = await (query as unknown as Promise<{ data: unknown; error: unknown; count: number | null }>);
  return { data, error, count };
}