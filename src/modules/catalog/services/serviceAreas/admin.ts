import { supabase } from '@/integrations/supabase/client';

/**
 * Admin-only reads for `business_service_areas` (CAT-4).
 *
 * - `listAdminServiceAreasWithBusinesses`: cross-business list joined to
 *   the parent business (name_ar, ref_id) for the admin locations page.
 * - `countAllServiceAreas`: head/count for the admin locations hub stats.
 *
 * Thin wrappers; preserve raw `{ data, error, count }` envelope.
 */

export interface ListAdminServiceAreasOptions {
  select?: string;
  order?: { column: string; ascending?: boolean };
  limit?: number;
}

export async function listAdminServiceAreasWithBusinesses<T = unknown>({
  select = 'id, business_id, city, district, is_primary, businesses!inner(name_ar, ref_id)',
  order = { column: 'created_at', ascending: false },
  limit = 1000,
}: ListAdminServiceAreasOptions = {}): Promise<{ data: T[] | null; error: unknown }> {
  const { data, error } = await supabase
    .from('business_service_areas')
    .select(select)
    .order(order.column, { ascending: order.ascending ?? true })
    .limit(limit);
  return { data: data as unknown as T[] | null, error };
}

export async function countAllServiceAreas(): Promise<{ count: number | null; error: unknown }> {
  const { count, error } = await supabase
    .from('business_service_areas')
    .select('id', { count: 'exact', head: true });
  return { count, error };
}