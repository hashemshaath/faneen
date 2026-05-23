import { supabase } from '@/integrations/supabase/client';
import type { CountResult } from './countLeadsByDateRange';

/**
 * L-2: count of `lead_requests` for a given business.
 * Preserves ProviderTipsCard semantics:
 *   supabase.from('lead_requests').select('id', { count: 'exact', head: true })
 *     .eq('business_id', businessId)
 */
export async function countLeadsForBusiness(
  businessId: string,
): Promise<CountResult> {
  const res = await supabase
    .from('lead_requests')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId);
  return { count: res.count ?? null, error: res.error };
}