import { supabase } from '@/integrations/supabase/client';

/**
 * Admin-only read for `business_services` (CAT-4).
 *
 * Mirrors the cross-business "lite" select used by the admin businesses
 * page (services duplicate detection / picker). Thin wrapper; raw
 * `{ data, error }` envelope preserved.
 */
export async function listAllBusinessServicesLite<T = unknown>(
  select: string = 'id, name_ar, name_en, business_id',
): Promise<{ data: T[] | null; error: unknown }> {
  const { data, error } = await supabase.from('business_services').select(select);
  return { data: data as unknown as T[] | null, error };
}