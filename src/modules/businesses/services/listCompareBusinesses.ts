import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for the public "compare providers" picker on Compare.tsx.
 * Phase 16: the legacy `categories(...)` join is gone — category labels are
 * resolved via `getPrimaryTaxonomyLabelsForBusinesses` from the taxonomy
 * module when needed. Cities join is preserved.
 */
const DEFAULT_SELECT =
  'id, name_ar, name_en, username, logo_url, rating_avg, rating_count, ' +
  'cities(name_ar, name_en)';

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