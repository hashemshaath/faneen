import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for admin-side `supabase.from('businesses').select(<select>)`
 * list reads. Supports caller-controlled select, ordered filters, single or
 * multiple orderBy specs, and an optional row limit. Returns raw `{ data, error }`.
 *
 * - Table: `businesses`
 * - Never throws on returned `{ error }`; bubbles thrown Supabase errors.
 * - Does not transform data.
 */
export type ListAdminBusinessesFilter =
  | { column: string; op: 'eq'; value: unknown }
  | { column: string; op: 'in'; value: unknown[] }
  | { column: string; op: 'is'; value: unknown }
  | { column: string; op: 'not'; operator: string; value: unknown };

export interface ListAdminBusinessesOrder {
  column: string;
  ascending?: boolean;
  nullsFirst?: boolean;
}

export interface ListAdminBusinessesOptions {
  select?: string;
  filters?: ListAdminBusinessesFilter[];
  orderBy?: ListAdminBusinessesOrder | ListAdminBusinessesOrder[];
  limit?: number;
}

export async function listAdminBusinesses<T = unknown>(
  options: ListAdminBusinessesOptions = {},
): Promise<{ data: T[] | null; error: unknown }> {
  const { select = '*', filters = [], orderBy, limit } = options;
  type AnyBuilder = {
    eq: (c: string, v: unknown) => AnyBuilder;
    in: (c: string, v: unknown[]) => AnyBuilder;
    is: (c: string, v: unknown) => AnyBuilder;
    not: (c: string, op: string, v: unknown) => AnyBuilder;
    order: (c: string, opts: { ascending?: boolean; nullsFirst?: boolean }) => AnyBuilder;
    limit: (n: number) => AnyBuilder;
    then: <R>(onFulfilled: (v: { data: unknown; error: unknown }) => R) => Promise<R>;
  };
  let query = supabase.from('businesses').select(select) as unknown as AnyBuilder;
  for (const f of filters) {
    if (f.op === 'eq') query = query.eq(f.column, f.value);
    else if (f.op === 'in') query = query.in(f.column, f.value);
    else if (f.op === 'is') query = query.is(f.column, f.value);
    else if (f.op === 'not') query = query.not(f.column, f.operator, f.value);
  }
  if (orderBy) {
    const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
    for (const o of orders) {
      const opts: { ascending?: boolean; nullsFirst?: boolean } = {
        ascending: o.ascending,
      };
      if (typeof o.nullsFirst === 'boolean') opts.nullsFirst = o.nullsFirst;
      query = query.order(o.column, opts);
    }
  }
  if (typeof limit === 'number') query = query.limit(limit);
  const { data, error } = await (query as unknown as Promise<{ data: unknown; error: unknown }>);
  return { data: data as T[] | null, error };
}