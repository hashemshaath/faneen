import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for the public "compare providers" picker on Compare.tsx.
 * Preserves the exact join/filter/order shape used today:
 *   .from('businesses')
 *   .select('id, name_ar, name_en, username, logo_url, rating_avg, rating_count,
 *           categories(name_ar, name_en), cities(name_ar, name_en)')
 *   .eq('is_active', true)
 *   .order('rating_avg', { ascending: false })
 */
const DEFAULT_SELECT =
  'id, name_ar, name_en, username, logo_url, rating_avg, rating_count, ' +
  'categories(name_ar, name_en), cities(name_ar, name_en)';

export interface ListCompareBusinessesOptions {
  select?: string;
}

export async function listCompareBusinesses<T = unknown>(
  options: ListCompareBusinessesOptions = {},
): Promise<{ data: T[] | null; error: unknown }> {
  const { select = DEFAULT_SELECT } = options;
  const { data, error } = await supabase
    .from('businesses')
    .select(select)
    .eq('is_active', true)
    .order('rating_avg', { ascending: false });
  return { data: (data as unknown as T[] | null), error };
}