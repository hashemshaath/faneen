import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for the public "active businesses" count used on the
 * About page stats strip. Preserves the exact head-count semantics:
 *   supabase.from('businesses').select('id', { count: 'exact', head: true })
 *           .eq('is_active', true)
 */
export async function countActiveBusinesses(): Promise<{
  count: number | null;
  error: unknown;
}> {
  const { count, error } = await supabase
    .from('businesses')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);
  return { count, error };
}