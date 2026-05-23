import { supabase } from '@/integrations/supabase/client';

/**
 * L-2: list quote requests for AdminQuoteOperations.
 * Preserves semantics:
 *   let q = supabase.from('quote_requests')
 *     .select('id, sector, city, status, created_at')
 *     .order('created_at', { ascending: false })
 *     .limit(1000);
 *   if (fromDateIso) q = q.gte('created_at', fromDateIso);
 *   if (sector !== 'all') q = q.eq('sector', sector);
 */
export interface AdminOpsQuoteRow {
  id: string;
  sector: string;
  city: string;
  status: string;
  created_at: string;
}

export const ADMIN_OPS_QUOTE_SELECT = 'id, sector, city, status, created_at';

export interface ListAdminOpsQuoteRequestsParams {
  fromDateIso: string | null;
  sector: string;
  limit?: number;
}

export async function listAdminOpsQuoteRequests({
  fromDateIso,
  sector,
  limit = 1000,
}: ListAdminOpsQuoteRequestsParams): Promise<AdminOpsQuoteRow[]> {
  let q = supabase
    .from('quote_requests')
    .select(ADMIN_OPS_QUOTE_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (fromDateIso) q = q.gte('created_at', fromDateIso);
  if (sector !== 'all') q = q.eq('sector', sector);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AdminOpsQuoteRow[];
}