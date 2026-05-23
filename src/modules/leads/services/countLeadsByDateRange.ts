import { supabase } from '@/integrations/supabase/client';

/**
 * L-2: count of `lead_requests` created on/after a given ISO timestamp.
 * Preserves exact AdminDashboardView semantics:
 *   supabase.from('lead_requests').select('id', { count: 'exact', head: true })
 *     .gte('created_at', sinceIso)
 * Returns the raw `PostgrestResponse`-shaped object the callsite consumed
 * via `cnt(x)` (i.e. `{ count }`).
 */
export interface CountResult {
  count: number | null;
  error: unknown;
}

export async function countLeadsByDateRange(
  sinceIso: string,
): Promise<CountResult> {
  const res = await supabase
    .from('lead_requests')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', sinceIso);
  return { count: res.count ?? null, error: res.error };
}