import { supabase } from '@/integrations/supabase/client';

/**
 * Mark the given address as primary. The DB trigger
 * `addresses_enforce_single_primary` demotes any other primary row of the
 * same owner atomically.
 */
export async function setPrimaryAddress(
  id: string,
): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('addresses')
    .update({ is_primary: true })
    .eq('id', id);
  return { error };
}