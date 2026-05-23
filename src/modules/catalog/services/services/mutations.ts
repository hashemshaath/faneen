import { supabase } from '@/integrations/supabase/client';

/**
 * Thin write wrappers for `business_services` (CAT-3 — provider dashboard).
 *
 * Each wrapper preserves the exact Supabase call shape used at the original
 * provider callsite. No payload transformation, no added fields, no behavior
 * change. Wrappers return the raw `{ data, error }` envelope so callsites
 * can keep their existing error/throw control flow.
 */

export type BusinessServiceInsertPayload = Record<string, unknown>;
export type BusinessServiceUpdatePayload = Record<string, unknown>;

export async function insertBusinessService(payload: BusinessServiceInsertPayload) {
  return await supabase.from('business_services').insert(payload);
}

export async function insertBusinessServices(rows: BusinessServiceInsertPayload[]) {
  return await supabase.from('business_services').insert(rows);
}

export async function updateBusinessServiceById(
  id: string,
  values: BusinessServiceUpdatePayload,
) {
  return await supabase.from('business_services').update(values).eq('id', id);
}

export async function deleteBusinessServiceById(id: string) {
  return await supabase.from('business_services').delete().eq('id', id);
}

/**
 * Delete every demo service for a business. Mirrors the exact
 * `eq('business_id', ...).eq('is_demo', true)` filter chain used by the
 * provider "clear demo" action.
 */
export async function deleteDemoBusinessServicesForBusiness(businessId: string) {
  return await supabase
    .from('business_services')
    .delete()
    .eq('business_id', businessId)
    .eq('is_demo', true);
}