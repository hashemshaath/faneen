import { supabase } from '@/integrations/supabase/client';

/**
 * L-2: lead analytics rows for a business since `sinceIso`.
 * Preserves ProviderLeadAnalytics semantics:
 *   .from('lead_requests')
 *   .select('id, status, created_at, viewed_at, quoted_at, accepted_at, rejected_at, closed_at, converted_contract_id, converted_at')
 *   .eq('business_id', businessId)
 *   .gte('created_at', sinceIso)
 * The callsite raises `new Error('lead_analytics_fetch_failed')` on error,
 * so this service throws the raw Postgrest error and the caller wraps it.
 */
export interface LeadAnalyticsRow {
  id: string;
  status: string;
  created_at: string;
  viewed_at: string | null;
  quoted_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  closed_at: string | null;
  converted_contract_id: string | null;
  converted_at: string | null;
}

export const LEAD_ANALYTICS_SELECT =
  'id, status, created_at, viewed_at, quoted_at, accepted_at, rejected_at, closed_at, converted_contract_id, converted_at';

export async function listLeadAnalyticsForBusiness(
  businessId: string,
  sinceIso: string,
): Promise<LeadAnalyticsRow[]> {
  const { data, error } = await supabase
    .from('lead_requests')
    .select(LEAD_ANALYTICS_SELECT)
    .eq('business_id', businessId)
    .gte('created_at', sinceIso);
  if (error) throw error;
  return (data ?? []) as LeadAnalyticsRow[];
}