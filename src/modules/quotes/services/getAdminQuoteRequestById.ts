import { supabase } from '@/integrations/supabase/client';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * L-2: full admin quote-request row by id.
 * Accepts either the UUID `id` or the public `ref_id`
 * (e.g. `REQ-1000002`) so URLs can use the human-friendly reference.
 * Throws on Postgrest error. Returns the raw row (caller casts to its
 * page-specific `AdminQuoteRow` shape).
 */
export async function getAdminQuoteRequestById<T = unknown>(
  idOrRef: string,
): Promise<T | null> {
  const column = UUID_RE.test(idOrRef) ? 'id' : 'ref_id';
  const { data, error } = await supabase
    .from('quote_requests')
    .select('*')
    .eq(column, idOrRef)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as T | null;
}