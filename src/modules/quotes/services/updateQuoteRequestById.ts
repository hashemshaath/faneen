import { supabase } from '@/integrations/supabase/client';

/**
 * L-3: update a quote_requests row by id.
 * Preserves exact AdminQuoteRequestDetails semantics:
 *   .from('quote_requests').update(values).eq('id', id)
 * Returns the raw Supabase result. Does not transform values.
 * Does not throw on Postgrest error — callers preserve existing
 * `{ error }` handling.
 */
export async function updateQuoteRequestById(params: {
  id: string;
  values: Record<string, unknown>;
}) {
  return await supabase
    .from('quote_requests')
    .update(params.values as never)
    .eq('id', params.id);
}