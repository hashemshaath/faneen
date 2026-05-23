import { supabase } from '@/integrations/supabase/client';

/**
 * P-24: Canonical wrapper for resolving business display data for the
 * customer "My Requests" dashboard. Preserves the exact behavior of the
 * legacy `getBusinessesForMyRequests` lead service: same table, select
 * string, `.in('id', ids)` filter, `data ?? []` fallback, and throw on
 * error. Returned as an array (not the raw `{ data, error }` shape).
 */
export interface RequestsBusiness {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  username: string | null;
}

export async function listBusinessesForRequests(
  businessIds: string[],
): Promise<RequestsBusiness[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name_ar, name_en, username')
    .in('id', businessIds);
  if (error) throw error;
  return (data ?? []) as RequestsBusiness[];
}