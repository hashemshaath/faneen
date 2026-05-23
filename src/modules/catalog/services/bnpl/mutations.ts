import { supabase } from '@/integrations/supabase/client';

/**
 * Thin write wrappers for BNPL catalog tables (CAT-5).
 *
 * - `bnpl_providers`: global admin CRUD.
 * - `business_bnpl_providers`: per-business enablement / config.
 *
 * Wrappers are intentionally thin: they preserve exact payloads,
 * filters, conflict targets, and return the raw `{ data, error }`
 * envelope from Supabase. No transformations, no thrown errors.
 */

// ── bnpl_providers (global) ──────────────────────────────────────

export async function insertBnplProvider(payload: Record<string, unknown>) {
  return await supabase.from('bnpl_providers').insert(payload);
}

export async function updateBnplProviderById({
  id,
  values,
}: {
  id: string;
  values: Record<string, unknown>;
}) {
  return await supabase.from('bnpl_providers').update(values).eq('id', id);
}

export async function deleteBnplProviderById(id: string) {
  return await supabase.from('bnpl_providers').delete().eq('id', id);
}

// ── business_bnpl_providers (per-business) ───────────────────────

export async function upsertBusinessBnplProvider(
  payload: Record<string, unknown>,
  options?: { onConflict?: string; ignoreDuplicates?: boolean },
) {
  return await supabase.from('business_bnpl_providers').upsert(payload, options);
}

export async function updateBusinessBnplProviderForBusiness({
  businessId,
  providerId,
  values,
}: {
  businessId: string;
  providerId: string;
  values: Record<string, unknown>;
}) {
  return await supabase
    .from('business_bnpl_providers')
    .update(values)
    .eq('business_id', businessId)
    .eq('bnpl_provider_id', providerId);
}