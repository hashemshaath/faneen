import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for `supabase.from('businesses').update(values).eq('id', id)`.
 *
 * - Table: `businesses`
 * - Filter: `id = id`
 * - Values: passed through unchanged (no shape transformation, no null/undefined filtering)
 * - No `.select()`, no `.single()`
 * - Returns raw Supabase `{ data, error }`; does not throw on its own.
 */
export interface UpdateBusinessByIdOptions {
  id: string;
  values: Record<string, unknown>;
}

export async function updateBusinessById(
  options: UpdateBusinessByIdOptions,
): Promise<{ data: unknown; error: unknown }> {
  const { id, values } = options;
  const { data, error } = await supabase
    .from('businesses')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(values as any)
    .eq('id', id);
  return { data, error };
}