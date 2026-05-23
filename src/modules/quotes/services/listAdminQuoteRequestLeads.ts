import { supabase } from '@/integrations/supabase/client';

/**
 * L-2: leads matched to a quote request (admin detail).
 * Preserves AdminQuoteRequestDetails semantics:
 *   .from('quote_request_leads')
 *   .select('id, status, match_score, match_reasons, created_at, viewed_at, responded_at, contact_revealed, contact_revealed_at, contact_view_count, provider:businesses!quote_request_leads_provider_id_fkey(id, name_ar, city_id)')
 *   .eq('quote_request_id', id)
 *   .order('match_score', { ascending: false })
 * Returns raw rows; caller casts via `unknown` to its row shape.
 */
export const ADMIN_QUOTE_LEAD_SELECT =
  'id, status, match_score, match_reasons, created_at, viewed_at, responded_at, contact_revealed, contact_revealed_at, contact_view_count, provider:businesses!quote_request_leads_provider_id_fkey(id, name_ar, city_id)';

export async function listAdminQuoteRequestLeads<T = unknown>(
  quoteRequestId: string,
): Promise<T[]> {
  const { data, error } = await supabase
    .from('quote_request_leads')
    .select(ADMIN_QUOTE_LEAD_SELECT)
    .eq('quote_request_id', quoteRequestId)
    .order('match_score', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as T[];
}