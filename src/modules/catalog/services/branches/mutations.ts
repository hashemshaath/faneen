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

export async function updateBusinessBranchById(
  id: string,
  values: BusinessBranchUpdatePayload,
) {
  return await supabase.from('business_branches').update(values).eq('id', id);
}

export async function deleteBusinessBranchById(id: string) {
  return await supabase.from('business_branches').delete().eq('id', id);
}