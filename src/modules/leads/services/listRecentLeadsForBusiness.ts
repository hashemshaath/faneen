import { supabase } from '@/integrations/supabase/client';

/**
 * L-2: recent (limit 20) lead requests for a business.
 * Preserves ProviderEngagementPreviews semantics:
 *   .from('lead_requests')
 *   .select('id, ref_id, status, created_at, subject, business_id')
 *   .eq('business_id', businessId)
 *   .order('created_at', { ascending: false })
 *   .limit(20)
 */
export interface RecentLeadRow {
  id: string;
  ref_id: string | null;
  status: string | null;
  created_at: string;
  subject: string | null;
  business_id: string | null;
}

export const RECENT_LEAD_SELECT =
  'id, ref_id, status, created_at, subject, business_id';

export async function listRecentLeadsForBusiness(
  businessId: string,
  limit = 20,
): Promise<RecentLeadRow[]> {
  const { data, error } = await supabase
    .from('lead_requests')
    .select(RECENT_LEAD_SELECT)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as RecentLeadRow[];
}