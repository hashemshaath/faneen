import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';

/**
 * Canonical wrapper for `supabase.from('profiles').insert(payload)`.
 *
 * - Table: `profiles`
 * - Payload: passed through unchanged
 * - Returns raw Supabase `{ data, error }`; never throws
 */
export interface InsertProfileOptions {
  payload: TablesInsert<'profiles'>;
}

export async function insertProfile(
  options: InsertProfileOptions,
): Promise<{ data: unknown; error: unknown }> {
  const { data, error } = await supabase.from('profiles').insert(options.payload);
  return { data, error };
}