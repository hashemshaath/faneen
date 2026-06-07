/**
 * Phase 14 — Contract & template ↔ taxonomy linking services.
 *
 * Reads / writes `contract_taxonomy_categories` (the link table created in
 * the Phase 14 migration). The legacy `service_category_id` columns on
 * `contracts` and `contract_templates` are intentionally not touched by
 * any of these helpers.
 */
import { supabase } from '@/integrations/supabase/client';
import type { TaxonomyCategory } from './types';

export type ContractTaxonomyRole = 'service' | 'secondary_service' | string;

export interface ContractTaxonomyLink {
  id: string;
  contract_id: string | null;
  template_id: string | null;
  category_id: string;
  role: ContractTaxonomyRole;
  is_primary: boolean;
}

function fail(error: unknown, ctx: string): never {
  const msg = error instanceof Error ? error.message : String(error);
  throw new Error(`[taxonomy:${ctx}] ${msg}`);
}

export async function getContractTaxonomyCategories(
  contractId: string,
): Promise<ContractTaxonomyLink[]> {
  const { data, error } = await supabase
    .from('contract_taxonomy_categories')
    .select('id, contract_id, template_id, category_id, role, is_primary')
    .eq('contract_id', contractId);
  if (error) fail(error, 'getContractTaxonomyCategories');
  return (data ?? []) as ContractTaxonomyLink[];
}

export async function getTemplateTaxonomyCategories(
  templateId: string,
): Promise<ContractTaxonomyLink[]> {
  const { data, error } = await supabase
    .from('contract_taxonomy_categories')
    .select('id, contract_id, template_id, category_id, role, is_primary')
    .eq('template_id', templateId);
  if (error) fail(error, 'getTemplateTaxonomyCategories');
  return (data ?? []) as ContractTaxonomyLink[];
}

export async function setContractTaxonomyCategories(
  payload: {
    contractId?: string | null;
    templateId?: string | null;
    primaryCategoryId: string | null;
    secondaryCategoryIds?: string[];
  },
): Promise<void> {
  const { error } = await supabase.rpc('set_contract_taxonomy_categories', {
    p_contract_id: payload.contractId ?? null,
    p_template_id: payload.templateId ?? null,
    p_primary_category_id: payload.primaryCategoryId,
    p_secondary_category_ids: payload.secondaryCategoryIds ?? [],
  });
  if (error) fail(error, 'setContractTaxonomyCategories');
}

/**
 * Picker list — service categories that are public and visible in
 * registration. Reused by contract/template editors.
 */
export async function getContractTaxonomyPickerCategories(): Promise<TaxonomyCategory[]> {
  const { data, error } = await supabase
    .from('taxonomy_categories')
    .select('*')
    .eq('is_active', true)
    .eq('is_public', true)
    .eq('is_archived', false)
    .or('show_in_registration.eq.true,show_in_search.eq.true')
    .order('sort_order', { ascending: true });
  if (error) fail(error, 'getContractTaxonomyPickerCategories');
  return (data ?? []) as TaxonomyCategory[];
}

/**
 * Preview-only backfill helper: given a legacy `service_category_id`,
 * return the taxonomy category it would map to via
 * `taxonomy_legacy_mappings`. Does NOT write anything.
 *
 * Phase 19c: the legacy `public.categories` table has been dropped, so
 * we can no longer resolve a legacy id → slug. This helper is now a
 * no-op kept only to preserve the public export signature; it always
 * returns `null`. There are no remaining runtime callers.
 */
export async function previewServiceCategoryTaxonomyMapping(
  _legacyCategoryId: string,
): Promise<{ category: TaxonomyCategory; via: 'slug-match' | 'legacy-map' } | null> {
  return null;
}