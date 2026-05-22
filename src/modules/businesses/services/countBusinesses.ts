import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for `supabase.from('businesses').select(<select>, { count: 'exact', head: true })`.
 *
 * - Table: `businesses`
 * - Select: caller-controlled column expression; default `'*'`
 * - Always uses `{ count: 'exact', head: true }` — head-only count probe
 * - Filters applied sequentially in caller-supplied order
 * - Returns raw Supabase `{ data, error, count }`. Never throws by itself.
 */
export type CountBusinessesFilter =
  | { column: string; op: 'eq' | 'gte' | 'lte'; value: unknown }
  | { column: string; op: 'in'; value: unknown[] }
  | { column: string; op: 'is'; value: unknown }
  | { column: string; op: 'not'; operator: string; value: unknown };

export interface CountBusinessesOptions {
  select?: string;
  filters?: CountBusinessesFilter[];
}

export async function countBusinesses(
  options: CountBusinessesOptions = {},
): Promise<{ data: unknown; error: unknown; count: number | null }> {
  const { select = '*', filters = [] } = options;
  type AnyFilterable = {
    eq: (c: string, v: unknown) => AnyFilterable;
    gte: (c: string, v: unknown) => AnyFilterable;
    lte: (c: string, v: unknown) => AnyFilterable;
    in: (c: string, v: unknown[]) => AnyFilterable;
    is: (c: string, v: unknown) => AnyFilterable;
    not: (c: string, op: string, v: unknown) => AnyFilterable;
    then: <R>(onFulfilled: (v: { data: unknown; error: unknown; count: number | null }) => R) => Promise<R>;
  };
  let query = supabase
    .from('businesses')
    .select(select, { count: 'exact', head: true }) as unknown as AnyFilterable;
  for (const f of filters) {
    if (f.op === 'eq') query = query.eq(f.column, f.value);
    else if (f.op === 'gte') query = query.gte(f.column, f.value);
    else if (f.op === 'lte') query = query.lte(f.column, f.value);
    else if (f.op === 'in') query = query.in(f.column, f.value);
    else if (f.op === 'is') query = query.is(f.column, f.value);
    else if (f.op === 'not') query = query.not(f.column, f.operator, f.value);
  }
  const { data, error, count } = await (query as unknown as Promise<{ data: unknown; error: unknown; count: number | null }>);
  return { data, error, count };
}