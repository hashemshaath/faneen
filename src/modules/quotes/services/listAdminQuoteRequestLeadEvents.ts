import { supabase } from '@/integrations/supabase/client';

/**
 * L-2: quote_request_lead_events for one quote request (admin timeline).
 * Preserves AdminQuoteRequestDetails semantics:
 *   .from('quote_request_lead_events')
 *   .select('id, event_type, actor_user_id, metadata, created_at, lead_id, lead:quote_request_leads!quote_request_lead_events_lead_id_fkey(provider:businesses!quote_request_leads_provider_id_fkey(name_ar))')
 *   .eq('quote_request_id', id)
 *   .order('created_at', { ascending: false })
 * Returns raw Postgrest result so the caller can use Promise.all + error logic.
 */
export const ADMIN_QUOTE_LEAD_EVENT_DETAIL_SELECT =
  'id, event_type, actor_user_id, metadata, created_at, lead_id, lead:quote_request_leads!quote_request_lead_events_lead_id_fkey(provider:businesses!quote_request_leads_provider_id_fkey(name_ar))';

export interface AdminQuoteRequestLeadEventsResult<T = unknown> {
  data: T[] | null;
  error: unknown;
}

export async function listAdminQuoteRequestLeadEvents<T = unknown>(
  quoteRequestId: string,
): Promise<AdminQuoteRequestLeadEventsResult<T>> {
  const res = await supabase
    .from('quote_request_lead_events')
    .select(ADMIN_QUOTE_LEAD_EVENT_DETAIL_SELECT)
    .eq('quote_request_id', quoteRequestId)
    .order('created_at', { ascending: false });
  return {
    data: (res.data ?? null) as unknown as T[] | null,
    error: res.error,
  };
}