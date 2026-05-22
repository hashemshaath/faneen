import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for the single-category lookup used by ProjectDetail
 * (drives JSON-LD + breadcrumb labels). Preserves `.single()` semantics —
 * Supabase will set `error` if not exactly one row is returned. Existing
 * callsites destructure `{ data }` and ignore the error; preserved verbatim.
 */
export interface GetCategoryByIdOptions {
  select?: string;
}

export async function getCategoryById<T = unknown>(
  id: string,
  options: GetCategoryByIdOptions = {},
): Promise<{ data: T | null; error: unknown }> {
  const { select = 'name_ar, name_en' } = options;
  const { data, error } = await supabase
    .from('categories')
    .select(select)
    .eq('id', id)
    .single();
  return { data: (data as unknown as T | null), error };
}