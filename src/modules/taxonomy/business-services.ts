/**
 * Taxonomy & Reference Data Center — Phase 3 business linking services.
 *
 * These helpers wrap reads from `taxonomy_categories` for registration /
 * business-edit pickers, and writes to `business_taxonomy_categories`
 * (via the `set_business_taxonomy_categories` RPC).
 *
 * IMPORTANT (Phase 3 contract):
 * - Legacy `businesses.sectors` and `businesses.sub_services` are NOT
 *   touched here. They remain the source of truth for existing search /
 *   matching / showcase flows until Phase 4 migrates those readers.
 * - Writes go through the RPC so RLS + validation are enforced server-side.
 */
import { supabase } from '@/integrations/supabase/client';
import type { TaxonomyCategory } from './types';

export type BusinessTaxonomyRole =
  | 'entity_type'
  | 'primary_activity'
  | 'secondary_activity'
  | 'service'
  | 'product_category'
  | 'material_type'
  | 'custom';

export interface BusinessTaxonomyLink {
  id: string;
  business_id: string;
  category_id: string;
  role: BusinessTaxonomyRole;
  is_primary: boolean;
}

export interface SetBusinessTaxonomyPayload {
  entityTypeCategoryId: string | null;
  primaryActivityCategoryId: string | null;
  secondaryActivityCategoryIds: string[];
}

function fail(error: unknown, ctx: string): never {
  const msg = error instanceof Error ? error.message : String(error);
  throw new Error(`[taxonomy:${ctx}] ${msg}`);
}

/** Read all active+public+registration-visible categories for a given type code. */
export async function getPublicTaxonomyCategoriesByType(
  typeCode: string,
): Promise<TaxonomyCategory[]> {
  const { data: typeRow, error: typeErr } = await supabase
    .from('taxonomy_types')
    .select('id')
    .eq('code', typeCode)
    .maybeSingle();
  if (typeErr) fail(typeErr, 'getPublicTaxonomyCategoriesByType:type');
  if (!typeRow) return [];

  const { data, error } = await supabase
    .from('taxonomy_categories')
    .select('*')
    .eq('taxonomy_type_id', typeRow.id)
    .eq('is_active', true)
    .eq('is_public', true)
    .eq('is_archived', false)
    .eq('show_in_registration', true)
    .order('sort_order', { ascending: true });
  if (error) fail(error, 'getPublicTaxonomyCategoriesByType:list');
  return (data ?? []) as TaxonomyCategory[];
}

export function getRegistrationEntityTypes(): Promise<TaxonomyCategory[]> {
  return getPublicTaxonomyCategoriesByType('entity_type');
}

export async function getRegistrationPrimaryActivities(): Promise<TaxonomyCategory[]> {
  // Allow either the dedicated `primary_activity` type or `sector` type.
  const [primary, sector] = await Promise.all([
    getPublicTaxonomyCategoriesByType('primary_activity'),
    getPublicTaxonomyCategoriesByType('sector'),
  ]);
  return [...primary, ...sector];
}

/** Returns active children of a parent category (used for secondary activities). */
export async function getChildCategories(parentId: string): Promise<TaxonomyCategory[]> {
  const { data, error } = await supabase
    .from('taxonomy_categories')
    .select('*')
    .eq('parent_id', parentId)
    .eq('is_active', true)
    .eq('is_archived', false)
    .eq('show_in_registration', true)
    .order('sort_order', { ascending: true });
  if (error) fail(error, 'getChildCategories');
  return (data ?? []) as TaxonomyCategory[];
}

export async function getBusinessTaxonomyCategories(
  businessId: string,
): Promise<BusinessTaxonomyLink[]> {
  const { data, error } = await supabase
    .from('business_taxonomy_categories')
    .select('id, business_id, category_id, role, is_primary')
    .eq('business_id', businessId);
  if (error) fail(error, 'getBusinessTaxonomyCategories');
  return (data ?? []) as BusinessTaxonomyLink[];
}

/**
 * Atomically replace entity_type / primary_activity / secondary_activity links
 * for a business. Uses the server-side RPC so validation + RLS are enforced.
 */
export async function setBusinessTaxonomyCategories(
  businessId: string,
  payload: SetBusinessTaxonomyPayload,
): Promise<void> {
  const { error } = await supabase.rpc('set_business_taxonomy_categories', {
    p_business_id: businessId,
    p_entity_type_category_id: payload.entityTypeCategoryId,
    p_primary_activity_category_id: payload.primaryActivityCategoryId,
    p_secondary_activity_category_ids: payload.secondaryActivityCategoryIds,
  });
  if (error) fail(error, 'setBusinessTaxonomyCategories');
}