import { supabase } from '@/integrations/supabase/client';
import type { TablesUpdate } from '@/integrations/supabase/types';

/**
 * Canonical wrapper for `supabase.from('profiles').update(values).eq('id', id)`.
 *
 * - Table: `profiles`
 * - Filter: `id = id` (profile row id, not auth user id)
 * - Values: passed through unchanged
 * - Returns raw Supabase `{ data, error }`; never throws
 */
export interface UpdateProfileByIdOptions {
  id: string;
  values: TablesUpdate<'profiles'>;
}

export async function updateProfileById(
  options: UpdateProfileByIdOptions,
): Promise<{ data: unknown; error: unknown }> {
  const { id, values } = options;
  const { data, error } = await supabase
    .from('profiles')
    .update(values)
    .eq('id', id);
  return { data, error };
}