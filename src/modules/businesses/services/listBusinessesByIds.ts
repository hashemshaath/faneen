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
}

export async function listBusinessesByIds<T = unknown>(
  options: ListBusinessesByIdsOptions,
): Promise<{ data: T[] | null; error: unknown }> {
  const { ids, select = 'id, name_ar, name_en, username' } = options;
  const { data, error } = await supabase
    .from('businesses')
    .select(select)
    .in('id', ids);
  return { data: (data as unknown as T[] | null), error };
}