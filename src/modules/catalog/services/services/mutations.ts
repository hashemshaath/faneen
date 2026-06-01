import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

/**
 * Thin write wrappers for `business_services` (CAT-3 — provider dashboard).
 *
 * Each wrapper preserves the exact Supabase call shape used at the original
 * provider callsite. No payload transformation, no added fields, no behavior
 * change. Wrappers return the raw `{ data, error }` envelope so callsites
 * can keep their existing error/throw control flow.
 *
 * SERVICE-ACTIVATION-GOVERNANCE-FINAL — Policy A:
 * Activation + governance fields are stripped from these payload types so
 * non-governance call sites (admin business detail, provider service
 * editor, etc.) can NEVER toggle them through catalog mutations. All
 * activation writes must go through `@/modules/providerServices`.
 */

type RawInsert = Database['public']['Tables']['business_services']['Insert'];
type RawUpdate = Database['public']['Tables']['business_services']['Update'];

/**
 * Fields whose writes are owned by `@/modules/providerServices`. Stripping
 * them from the catalog payload types is the static half of Policy A; the
 * isolation audit (scripts/provider-services-isolation-audit.mjs) is the
 * runtime/source-grep half.
 */
type GovernanceWriteFields =
  | 'is_active'
  | 'provider_status'
  | 'admin_status'
  | 'required_plan_tier'
  | 'requires_admin_review'
  | 'is_premium_service'
  | 'is_featured'
  | 'admin_note'
  | 'provider_note'
  | 'rejection_reason'
  | 'reviewed_by'
  | 'reviewed_at';

export type BusinessServiceInsertPayload = Omit<RawInsert, GovernanceWriteFields>;
export type BusinessServiceUpdatePayload = Omit<RawUpdate, GovernanceWriteFields>;

export async function insertBusinessService(payload: BusinessServiceInsertPayload) {
  return await supabase.from('business_services').insert(payload as RawInsert);
}

export async function insertBusinessServices(rows: BusinessServiceInsertPayload[]) {
  return await supabase.from('business_services').insert(rows as RawInsert[]);
}

export async function updateBusinessServiceById(
  id: string,
  values: BusinessServiceUpdatePayload,
) {
  return await supabase.from('business_services').update(values as RawUpdate).eq('id', id);
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