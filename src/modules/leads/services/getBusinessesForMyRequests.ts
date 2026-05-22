import { supabase } from '@/integrations/supabase/client';

export interface MyRequestsBusiness {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  username: string | null;
}

/**
 * D4: Resolves business display data for the customer "My Requests"
 * dashboard. Extracted verbatim from DashboardMyRequests.tsx — preserves
 * exact table, select string, `.in('id', ids)` filter, and error throw.
 */
export async function getBusinessesForMyRequests(businessIds: string[]): Promise<MyRequestsBusiness[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name_ar, name_en, username')
    .in('id', businessIds);
  if (error) throw error;
  return (data ?? []) as MyRequestsBusiness[];
}