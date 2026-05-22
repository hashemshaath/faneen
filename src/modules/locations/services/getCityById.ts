import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for the single-city lookup used by ProjectDetail
 * (drives JSON-LD + visible city label). Preserves `.single()` semantics.
 */
export interface GetCityByIdOptions {
  select?: string;
}

export async function getCityById<T = unknown>(
  id: string,
  options: GetCityByIdOptions = {},
): Promise<{ data: T | null; error: unknown }> {
  const { select = 'name_ar, name_en' } = options;
  const { data, error } = await supabase
    .from('cities')
    .select(select)
    .eq('id', id)
    .single();
  return { data: (data as unknown as T | null), error };
}