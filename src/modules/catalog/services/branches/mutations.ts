import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

/**
 * Thin write wrappers for `business_branches` (CAT-4 — admin).
 *
 * Wrappers preserve exact Supabase call shape used at admin callsites.
 * No payload transformation, no added fields. Returns raw `{ data, error }`
 * so callsites keep their existing error/throw control flow.
 */

export type BusinessBranchInsertPayload =
  Database['public']['Tables']['business_branches']['Insert'];
export type BusinessBranchUpdatePayload =
  Database['public']['Tables']['business_branches']['Update'];

export async function insertBusinessBranch(payload: BusinessBranchInsertPayload) {
  return await supabase.from('business_branches').insert(payload);
}

/**
 * Variant of `insertBusinessBranch` that returns the inserted row(s) via
 * `.select(...)` with either `.single()` or `.maybeSingle()`. Kept here so all
 * `.from('business_branches')` access stays inside the canonical catalog
 * wrapper (CAT-4 isolation).
 */
export async function insertBusinessBranchReturning(
  payload: BusinessBranchInsertPayload,
  select: string,
  terminal: 'single' | 'maybeSingle',
) {
  const base = supabase.from('business_branches').insert(payload).select(select);
  return terminal === 'single' ? await base.single() : await base.maybeSingle();
}

/**
 * Bulk variant of {@link insertBusinessBranchReturning} — inserts an array of
 * rows and returns the inserted records via `.select(...)`. Used by the
 * onboarding wizard to register secondary branches in one round-trip while
 * keeping all `business_branches` access inside the catalog wrapper
 * (CAT-4/CAT-6 isolation).
 */
export async function insertBusinessBranchesReturning<S extends string = 'id'>(
  payload: BusinessBranchInsertPayload[],
  select: S = 'id' as S,
) {
  return await supabase.from('business_branches').insert(payload).select(select);
}

export async function updateBusinessBranchById(
  id: string,
  values: BusinessBranchUpdatePayload,
) {
  return await supabase.from('business_branches').update(values).eq('id', id);
}

export async function deleteBusinessBranchById(id: string) {
  return await supabase.from('business_branches').delete().eq('id', id);
}

/**
 * BRANCHES-PRO: atomically set a branch as the main branch for its business
 * via the `set_main_branch(branch_id)` RPC. Clears the previous main flag
 * and sets the target in a single SECURITY DEFINER transaction.
 */
export async function setMainBranch(branchId: string) {
   
  return await (supabase as any).rpc('set_main_branch', { p_branch_id: branchId });
}

// ---------- branch_services (link products/services to a branch) ----------
export async function attachServiceToBranch(params: {
  branchId: string; serviceId: string; businessId: string;
}) {
   
  return await (supabase as any)
    .from('branch_services')
    .upsert({
      branch_id: params.branchId,
      service_id: params.serviceId,
      business_id: params.businessId,
    }, { onConflict: 'branch_id,service_id' });
}

export async function detachServiceFromBranch(params: {
  branchId: string; serviceId: string;
}) {
   
  return await (supabase as any)
    .from('branch_services')
    .delete()
    .eq('branch_id', params.branchId)
    .eq('service_id', params.serviceId);
}

// ---------- branch_promotions (link offers to a branch) ----------
export async function attachPromotionToBranch(params: {
  branchId: string; promotionId: string; businessId: string;
}) {
   
  return await (supabase as any)
    .from('branch_promotions')
    .upsert({
      branch_id: params.branchId,
      promotion_id: params.promotionId,
      business_id: params.businessId,
    }, { onConflict: 'branch_id,promotion_id' });
}

export async function detachPromotionFromBranch(params: {
  branchId: string; promotionId: string;
}) {
   
  return await (supabase as any)
    .from('branch_promotions')
    .delete()
    .eq('branch_id', params.branchId)
    .eq('promotion_id', params.promotionId);
}