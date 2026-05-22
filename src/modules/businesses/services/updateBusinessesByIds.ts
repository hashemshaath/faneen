import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for `supabase.from('businesses').update(values).in('id', ids)`.
 *
 * - Table: `businesses`
 * - Filter: `id IN ids`
 * - Values: passed through unchanged (no shape transformation, no null/undefined filtering)
 * - No `.select()`, no `.single()`
 * - Returns raw Supabase `{ data, error }`; does not throw on its own.
 */
export interface UpdateBusinessesByIdsOptions {
  ids: string[];
  values: Record<string, unknown>;
}

export async function updateBusinessesByIds(
  options: UpdateBusinessesByIdsOptions,
): Promise<{ data: unknown; error: unknown }> {
  const { ids, values } = options;
  const { data, error } = await supabase
    .from('businesses')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(values as any)
    .in('id', ids);
  return { data, error };
}
