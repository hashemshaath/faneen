import { supabase } from '@/integrations/supabase/client';

/**
 * L-2: quote_request_events for one quote request (admin timeline).
 * Preserves AdminQuoteRequestDetails semantics:
 *   .from('quote_request_events')
 *   .select('id, event_type, actor_user_id, metadata, created_at')
 *   .eq('quote_request_id', id)
 *   .order('created_at', { ascending: false })
 * Returns the raw Postgrest builder result (data + error) so the caller
 * can keep its existing `Promise.all` + error handling pattern.
 */
export interface AdminQuoteRequestEventRow {
  id: string;
  event_type: string;
  actor_user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export const ADMIN_QUOTE_EVENT_SELECT =
  'id, event_type, actor_user_id, metadata, created_at';

export interface AdminQuoteRequestEventsResult {
  data: AdminQuoteRequestEventRow[] | null;
  error: unknown;
}

export async function listAdminQuoteRequestEvents(
  quoteRequestId: string,
): Promise<AdminQuoteRequestEventsResult> {
  const res = await supabase
    .from('quote_request_events')
    .select(ADMIN_QUOTE_EVENT_SELECT)
    .eq('quote_request_id', quoteRequestId)
    .order('created_at', { ascending: false });
  return {
    data: (res.data ?? null) as AdminQuoteRequestEventRow[] | null,
    error: res.error,
  };
}