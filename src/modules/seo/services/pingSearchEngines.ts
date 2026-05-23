import { supabase } from '@/integrations/supabase/client';

/**
 * EF-5: Thin wrapper around the `ping-search-engines` edge function.
 * Preserves the existing payload shape (e.g. `{ url }` or `{ source }`).
 * Returns the raw `{ data, error }` from `supabase.functions.invoke`.
 */
export async function pingSearchEngines(
  payload: Record<string, unknown>,
): Promise<ReturnType<typeof supabase.functions.invoke>> {
  return supabase.functions.invoke('ping-search-engines', { body: payload });
}