import { supabase } from '@/integrations/supabase/client';

/**
 * L-2: list quote_request_events for a batch of quote ids (admin ops).
 * Preserves semantics:
 *   .from('quote_request_events')
 *   .select('id, quote_request_id, event_type, metadata, created_at')
 *   .in('quote_request_id', quoteIds)
 *   .limit(5000)
 */
export interface AdminOpsQuoteEventRow {
  id: string;
  quote_request_id: string;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export const ADMIN_OPS_QUOTE_EVENT_SELECT =
  'id, quote_request_id, event_type, metadata, created_at';

export async function listAdminOpsQuoteRequestEvents(
  quoteIds: string[],
  limit = 5000,
): Promise<AdminOpsQuoteEventRow[]> {
  if (quoteIds.length === 0) return [];
  const { data, error } = await supabase
    .from('quote_request_events')
    .select(ADMIN_OPS_QUOTE_EVENT_SELECT)
    .in('quote_request_id', quoteIds)
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AdminOpsQuoteEventRow[];
}