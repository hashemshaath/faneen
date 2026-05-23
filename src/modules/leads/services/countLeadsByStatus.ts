import { supabase } from '@/integrations/supabase/client';
import type { CountResult } from './countLeadsByDateRange';

/**
 * L-2: count of `lead_requests` filtered by status.
 * Preserves AdminDashboardView semantics:
 *   supabase.from('lead_requests').select('id', { count: 'exact', head: true })
 *     .eq('status', status)
 */
export async function countLeadsByStatus(status: string): Promise<CountResult> {
  const res = await supabase
    .from('lead_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', status);
  return { count: res.count ?? null, error: res.error };
}