import { supabase } from '@/integrations/supabase/client';

/**
 * L-2: full admin quote-request row by id.
 * Preserves AdminQuoteRequestDetails semantics:
 *   .from('quote_requests').select('*').eq('id', id).maybeSingle()
 * Throws on Postgrest error. Returns the raw row (caller casts to its
 * page-specific `AdminQuoteRow` shape).
 */
export async function getAdminQuoteRequestById<T = unknown>(
  id: string,
): Promise<T | null> {
  const { data, error } = await supabase
    .from('quote_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as T | null;
}