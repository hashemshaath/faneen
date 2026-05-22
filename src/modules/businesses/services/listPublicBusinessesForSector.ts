import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for SEO-sensitive public sector business list reads
 * (sector landing, sector+city, sector brief).
 *
 * - Table: `businesses`
 * - Caller-controlled `select` (typically joins `cities(...)`)
 * - Caller-controlled filters applied sequentially in given order
 * - Optional single or multiple orderBy
 * - Optional `limit` and `range`
 * - Returns raw `{ data, error }`. Never throws by itself; bubbles thrown Supabase errors.
 */
export type ListPublicBusinessesForSectorFilter =
  | { column: string; op: 'eq'; value: unknown }
  | { column: string; op: 'in'; value: unknown[] }
  | { column: string; op: 'is'; value: unknown }
  | { column: string; op: 'not'; operator: string; value: unknown };

export interface ListPublicBusinessesForSectorOrder {
  column: string;
  ascending?: boolean;
  nullsFirst?: boolean;
}

export interface ListPublicBusinessesForSectorOptions {
  select: string;
  filters?: ListPublicBusinessesForSectorFilter[];
  orderBy?: ListPublicBusinessesForSectorOrder | ListPublicBusinessesForSectorOrder[];
  limit?: number;
  range?: { from: number; to: number };
}

export async function listPublicBusinessesForSector<T = unknown>(
  options: ListPublicBusinessesForSectorOptions,
): Promise<{ data: T[] | null; error: unknown }> {
  const { select, filters = [], orderBy, limit, range } = options;
  type AnyBuilder = {
    eq: (c: string, v: unknown) => AnyBuilder;
    in: (c: string, v: unknown[]) => AnyBuilder;
    is: (c: string, v: unknown) => AnyBuilder;
    not: (c: string, op: string, v: unknown) => AnyBuilder;
    order: (c: string, opts: { ascending?: boolean; nullsFirst?: boolean }) => AnyBuilder;
    limit: (n: number) => AnyBuilder;
    range: (from: number, to: number) => AnyBuilder;
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
      const opts: { ascending?: boolean; nullsFirst?: boolean } = { ascending: o.ascending };
      if (typeof o.nullsFirst === 'boolean') opts.nullsFirst = o.nullsFirst;
      query = query.order(o.column, opts);
    }
  }
  if (typeof limit === 'number') query = query.limit(limit);
  if (range) query = query.range(range.from, range.to);
  const { data, error } = await (query as unknown as Promise<{ data: unknown; error: unknown }>);
  return { data: data as T[] | null, error };
}