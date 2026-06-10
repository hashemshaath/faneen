import { supabase } from '@/integrations/supabase/client';
import { normalizeUsername } from '@/lib/business/profileHref';

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
  const username = normalizeUsername(options.username);
  if (!username) return { data: null, error: null };
  const { data, error } = await supabase
    .from('businesses_public')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  return { data: (data as unknown as { id: string } | null), error };
}