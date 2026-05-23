import { supabase } from '@/integrations/supabase/client';

export interface QuoteRequestEventInsert {
  quote_request_id: string;
  event_type: string;
  actor_user_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * L-3: insert a quote_request_events audit row.
 * Preserves exact AdminQuoteRequestDetails semantics:
 *   .from('quote_request_events').insert(payload)
 * Returns the raw Supabase result. Does not transform payload.
 * Does not append .select(). Does not throw on Postgrest error —
 * callers preserve existing handling.
 */
export async function insertQuoteRequestEvent(
  payload: QuoteRequestEventInsert,
) {
  return await supabase
    .from('quote_request_events')
    .insert(payload as never);
}