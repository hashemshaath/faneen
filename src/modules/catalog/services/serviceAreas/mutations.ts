import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

/**
 * Thin write wrappers for `business_service_areas` (CAT-3 — provider).
 * The set-primary flow is intentionally split into two calls so callsites
 * keep full control over ordering and error handling.
 */

export type ServiceAreaInsertPayload =
  Database['public']['Tables']['business_service_areas']['Insert'];

export async function insertServiceArea(payload: ServiceAreaInsertPayload) {
  return await supabase.from('business_service_areas').insert(payload);
}

export async function deleteServiceAreaById(id: string) {
  return await supabase.from('business_service_areas').delete().eq('id', id);
}

/** Clears the `is_primary` flag for every row in the given business. */
export async function clearPrimaryServiceAreasForBusiness(businessId: string) {
  return await supabase
    .from('business_service_areas')
    .update({ is_primary: false })
    .eq('business_id', businessId);
}

/** Marks a single service area row as primary. */
export async function setServiceAreaPrimaryById(id: string) {
  return await supabase
    .from('business_service_areas')
    .update({ is_primary: true })
    .eq('id', id);
}