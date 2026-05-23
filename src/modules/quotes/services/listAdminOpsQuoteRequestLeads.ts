import { supabase } from '@/integrations/supabase/client';

/**
 * L-2: list quote_request_leads for a batch of quote ids (admin ops).
 * Preserves semantics:
 *   .from('quote_request_leads')
 *   .select('id, quote_request_id, provider_id, status, match_score, match_reasons, viewed_at, responded_at, contact_revealed, contact_revealed_at, contact_view_count, created_at, provider:businesses!quote_request_leads_provider_id_fkey(id, name_ar, city_id, last_active_at)')
 *   .in('quote_request_id', quoteIds)
 *   .limit(5000)
 * `enabled: quoteIds.length > 0` lives in the caller; this service also
 * short-circuits an empty input for safety.
 */
export const ADMIN_OPS_QUOTE_LEAD_SELECT =
  'id, quote_request_id, provider_id, status, match_score, match_reasons, viewed_at, responded_at, contact_revealed, contact_revealed_at, contact_view_count, created_at, provider:businesses!quote_request_leads_provider_id_fkey(id, name_ar, city_id, last_active_at)';

export async function listAdminOpsQuoteRequestLeads<T = unknown>(
  quoteIds: string[],
  limit = 5000,
): Promise<T[]> {
  if (quoteIds.length === 0) return [];
  const { data, error } = await supabase
    .from('quote_request_leads')
    .select(ADMIN_OPS_QUOTE_LEAD_SELECT)
    .in('quote_request_id', quoteIds)
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as T[];
}