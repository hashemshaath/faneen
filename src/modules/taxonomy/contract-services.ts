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
 */
export async function previewServiceCategoryTaxonomyMapping(
  legacyCategoryId: string,
): Promise<{ category: TaxonomyCategory; via: 'slug-match' | 'legacy-map' } | null> {
  // Resolve the legacy category slug first.
  const { data: legacy } = await supabase
    .from('categories')
    .select('slug')
    .eq('id', legacyCategoryId)
    .maybeSingle();
  const legacySlug = (legacy as { slug?: string | null } | null)?.slug ?? null;
  if (!legacySlug) return null;

  // Try a direct slug match in taxonomy_categories first.
  const { data: direct } = await supabase
    .from('taxonomy_categories')
    .select('*')
    .eq('slug', legacySlug)
    .eq('is_active', true)
    .maybeSingle();
  if (direct) return { category: direct as TaxonomyCategory, via: 'slug-match' };

  // Fall back to the admin-managed legacy mapping table.
  const { data: mapping } = await supabase
    .from('taxonomy_legacy_mappings')
    .select('taxonomy_slug')
    .eq('legacy_key', legacySlug.toLowerCase())
    .maybeSingle();
  const mappedSlug = (mapping as { taxonomy_slug?: string | null } | null)?.taxonomy_slug ?? null;
  if (!mappedSlug) return null;
  const { data: mapped } = await supabase
    .from('taxonomy_categories')
    .select('*')
    .eq('slug', mappedSlug)
    .eq('is_active', true)
    .maybeSingle();
  return mapped ? { category: mapped as TaxonomyCategory, via: 'legacy-map' } : null;
}