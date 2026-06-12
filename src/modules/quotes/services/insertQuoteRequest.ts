import { supabase } from '@/integrations/supabase/client';

/**
 * Insert a new row into `quote_requests`.
 * Canonical wrapper for UI components that submit an RFQ directly
 * (e.g. business-profile RFQ tab). Preserves exact semantics:
 *   .from('quote_requests').insert(values)
 * Throws on Postgrest error so callers preserve existing try/catch
 * behavior. Does not transform values or return shape.
 */
export async function insertQuoteRequest(
  values: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from('quote_requests')
    .insert(values as never);
  if (error) throw error;
}