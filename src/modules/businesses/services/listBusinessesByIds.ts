import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for `supabase.from('businesses').select(...).in('id', ids)`.
 * Used by public pages (BrandDetail, Compare) and admin lookups.
 *
 * - Table: `businesses`
 * - Filter: `id IN (ids)`
 * - Select: caller-controlled; default `'id, name_ar, name_en, username'`
 * - Errors: returned via `{ data, error }`; never thrown.
 */
export interface ListBusinessesByIdsOptions {
  ids: string[];
  select?: string;
  /**
   * Optional nested equality filters applied via PostgREST embedded
   * filter syntax — e.g. `['business_services.is_active', true]`.
   * Lets callers gate embedded rows (e.g. eligibility) without
   * forcing an inner join on the parent row.
   */
  nestedEq?: Array<[string, unknown]>;
}

export async function listBusinessesByIds<T = unknown>(
  options: ListBusinessesByIdsOptions,
): Promise<{ data: T[] | null; error: unknown }> {
  const { ids, select = 'id, name_ar, name_en, username', nestedEq } = options;
  let q = supabase
    .from('businesses')
    .select(select)
    .in('id', ids);
  if (nestedEq) {
    for (const [col, val] of nestedEq) q = q.eq(col, val as never);
  }
  const { data, error } = await q;
  return { data: (data as unknown as T[] | null), error };
}