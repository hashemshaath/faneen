import { supabase } from '@/integrations/supabase/client';
import type { TablesUpdate } from '@/integrations/supabase/types';

/**
 * Canonical wrapper for `supabase.from('profiles').update(values).in('id', ids)`.
 *
 * - Table: `profiles`
 * - Filter: `id IN (ids)` (profile row ids)
 * - Values: passed through unchanged
 * - Returns raw Supabase `{ data, error }`; never throws
 */
export interface UpdateProfilesByIdsOptions {
  ids: string[];
  values: TablesUpdate<'profiles'>;
}

export async function updateProfilesByIds(
  options: UpdateProfilesByIdsOptions,
): Promise<{ data: unknown; error: unknown }> {
  const { ids, values } = options;
  const { data, error } = await supabase
    .from('profiles')
    .update(values)
    .in('id', ids);
  return { data, error };
}