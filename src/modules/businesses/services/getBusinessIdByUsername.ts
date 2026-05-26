import { supabase } from '@/integrations/supabase/client';

/**
 * Wrapper for `supabase.from('businesses').select('id').eq('username', username).maybeSingle()`.
 * Used by `UsernameResolver` to resolve `/:username` routes.
 */
export interface GetBusinessIdByUsernameOptions {
  username: string;
}

export async function getBusinessIdByUsername(
  options: GetBusinessIdByUsernameOptions,
): Promise<{ data: { id: string } | null; error: unknown }> {
  const { username } = options;
  const { data, error } = await supabase
    .from('businesses')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  return { data: (data as unknown as { id: string } | null), error };
}