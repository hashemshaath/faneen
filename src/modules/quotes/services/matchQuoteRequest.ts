import { supabase } from '@/integrations/supabase/client';

export interface MatchQuoteRequestBody {
  quote_request_id: string | undefined;
  limit: number;
}

/**
 * L-4: invoke the `match-quote-request` edge function.
 * Preserves AdminQuoteRequestDetails semantics exactly:
 *   supabase.functions.invoke('match-quote-request', { body })
 * Returns the raw { data, error } result. Does not transform body
 * or response. Does not throw — callers preserve existing handling.
 */
export async function matchQuoteRequest(body: MatchQuoteRequestBody) {
  return await supabase.functions.invoke('match-quote-request', { body });
}