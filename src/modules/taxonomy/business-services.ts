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
import { isLegacyPrimarySlug } from './canonical-primaries';

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

/** Safe Batch 2 — multi-primary payload. */
export interface SetBusinessTaxonomyPayloadV2 {
  entityTypeCategoryId: string | null;
  primaryActivityCategoryIds: string[];
  secondaryActivityCategoryIds: string[];
}

function fail(error: unknown, ctx: string): never {
  // Supabase returns plain objects with { message, details, hint, code }.
  // `String(obj)` produces "[object Object]", so format defensively.
  let msg: string;
  if (error instanceof Error) {
    msg = error.message;
  } else if (error && typeof error === 'object') {
    const e = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts: string[] = [];
    if (typeof e.message === 'string' && e.message) parts.push(e.message);
    if (typeof e.details === 'string' && e.details) parts.push(e.details);
    if (typeof e.hint === 'string' && e.hint) parts.push(`hint: ${e.hint}`);
    if (typeof e.code === 'string' && e.code) parts.push(`code: ${e.code}`);
    msg = parts.length ? parts.join(' — ') : JSON.stringify(error);
  } else {
    msg = String(error);
  }
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
  // Safe Batch 5 — defense-in-depth: even if a legacy slug somehow has
  // `show_in_registration=true`, never expose it in user-facing pickers.
  return ((data ?? []) as TaxonomyCategory[]).filter((c) => !isLegacyPrimarySlug(c.slug));
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
  return ((data ?? []) as TaxonomyCategory[]).filter((c) => !isLegacyPrimarySlug(c.slug));
}

/**
 * Safe Batch 2 — fetch children for multiple parent categories in one round
 * trip and return them grouped by parent_id. Used by the multi-primary picker.
 */
export async function getChildCategoriesGrouped(
  parentIds: string[],
): Promise<Record<string, TaxonomyCategory[]>> {
  if (!parentIds.length) return {};
  const { data, error } = await supabase
    .from('taxonomy_categories')
    .select('*')
    .in('parent_id', parentIds)
    .eq('is_active', true)
    .eq('is_archived', false)
    .eq('show_in_registration', true)
    .order('sort_order', { ascending: true });
  if (error) fail(error, 'getChildCategoriesGrouped');
  const grouped: Record<string, TaxonomyCategory[]> = {};
  for (const id of parentIds) grouped[id] = [];
  for (const row of (data ?? []) as TaxonomyCategory[]) {
    if (isLegacyPrimarySlug(row.slug)) continue;
    const pid = row.parent_id as string | null;
    if (pid && grouped[pid]) grouped[pid].push(row);
  }
  return grouped;
}

/**
 * Fetch taxonomy categories by id list. Used as a fallback so persisted
 * primary IDs that are not in the curated `getRegistrationPrimaryActivities`
 * subset still resolve to a human-readable label instead of leaking the UUID.
 */
export async function getTaxonomyCategoriesByIds(
  ids: string[],
): Promise<TaxonomyCategory[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('taxonomy_categories')
    .select('*')
    .in('id', ids);
  if (error) fail(error, 'getTaxonomyCategoriesByIds');
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
 * Phase 16 — display helper. Resolve the primary taxonomy display label
 * (name_ar/name_en) for a set of businesses by joining
 * `business_taxonomy_categories` ↦ `taxonomy_categories`. The "primary"
 * label is picked in this priority order:
 *   1. row with `is_primary = true`
 *   2. row with `role = 'primary_activity'`
 *   3. row with `role = 'entity_type'`
 *   4. first remaining row
 *
 * Returns a map keyed by business id. Businesses with no taxonomy links
 * are simply absent from the map (callers display "غير مصنّف" fallback).
 * Never throws — taxonomy display is best-effort.
 */
export interface PrimaryTaxonomyLabel {
  category_id: string;
  name_ar: string | null;
  name_en: string | null;
  slug: string | null;
  icon: string | null;
}
export async function getPrimaryTaxonomyLabelsForBusinesses(
  businessIds: string[],
): Promise<Record<string, PrimaryTaxonomyLabel>> {
  if (!businessIds.length) return {};
  const { data } = await supabase
    .from('business_taxonomy_categories')
    .select(
      'business_id, category_id, role, is_primary, taxonomy_categories(name_ar, name_en, slug, icon)',
    )
    .in('business_id', businessIds);
  if (!data) return {};
  type Row = {
    business_id: string;
    category_id: string;
    role: string | null;
    is_primary: boolean | null;
    taxonomy_categories: { name_ar: string | null; name_en: string | null; slug: string | null; icon: string | null } | null;
  };
  const grouped: Record<string, Row[]> = {};
  for (const r of data as unknown as Row[]) {
    (grouped[r.business_id] ??= []).push(r);
  }
  const out: Record<string, PrimaryTaxonomyLabel> = {};
  for (const [bid, rows] of Object.entries(grouped)) {
    const pick =
      rows.find((r) => r.is_primary === true) ??
      rows.find((r) => r.role === 'primary_activity') ??
      rows.find((r) => r.role === 'entity_type') ??
      rows[0];
    if (!pick) continue;
    out[bid] = {
      category_id: pick.category_id,
      name_ar: pick.taxonomy_categories?.name_ar ?? null,
      name_en: pick.taxonomy_categories?.name_en ?? null,
      slug: pick.taxonomy_categories?.slug ?? null,
      icon: pick.taxonomy_categories?.icon ?? null,
    };
  }
  return out;
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

/**
 * Safe Batch 2 — atomically replace entity_type + primary_activity (multiple)
 * + secondary_activity links. Calls the v2 RPC, which leaves any other
 * `business_taxonomy_categories` rows (e.g. service, product_category) intact.
 */
export async function setBusinessTaxonomyCategoriesV2(
  businessId: string,
  payload: SetBusinessTaxonomyPayloadV2,
): Promise<void> {
  // Pre-validate primary IDs client-side: the DB function rejects any
  // primary that is inactive / private / archived, or whose taxonomy type
  // is not `primary_activity` / `sector`. If we send those ids the RPC
  // raises `INVALID_PRIMARY_ACTIVITY` without telling us which one, so we
  // sanitize here and only pass through the ones the DB will accept.
  let primaryIds = payload.primaryActivityCategoryIds ?? [];
  let secondaryIds = payload.secondaryActivityCategoryIds ?? [];
  if (primaryIds.length) {
    const { data: rows, error: vErr } = await supabase
      .from('taxonomy_categories')
      .select('id, is_active, is_public, is_archived, taxonomy_types!inner(code)')
      .in('id', primaryIds);
    if (vErr) fail(vErr, 'setBusinessTaxonomyCategoriesV2:validate-primaries');
    type Row = {
      id: string;
      is_active: boolean | null;
      is_public: boolean | null;
      is_archived: boolean | null;
      taxonomy_types: { code: string | null } | { code: string | null }[] | null;
    };
    const valid = new Set<string>();
    for (const r of (rows ?? []) as Row[]) {
      const tt = Array.isArray(r.taxonomy_types) ? r.taxonomy_types[0] : r.taxonomy_types;
      const code = tt?.code ?? null;
      if (
        r.is_active &&
        r.is_public &&
        !r.is_archived &&
        (code === 'primary_activity' || code === 'sector')
      ) {
        valid.add(r.id);
      }
    }
    const dropped = primaryIds.filter((id) => !valid.has(id));
    if (dropped.length) {
      // eslint-disable-next-line no-console
      console.warn(
        '[taxonomy] dropping invalid primary activity ids (inactive/private/archived/wrong-type):',
        dropped,
      );
    }
    primaryIds = primaryIds.filter((id) => valid.has(id));
    // Drop any secondary whose parent primary was just removed — the DB
    // would otherwise raise SECONDARY_NOT_CHILD_OF_PRIMARY.
    if (dropped.length && secondaryIds.length) {
      const { data: secRows } = await supabase
        .from('taxonomy_categories')
        .select('id, parent_id')
        .in('id', secondaryIds);
      const stillValidParents = new Set(primaryIds);
      secondaryIds = secondaryIds.filter((sid) => {
        const row = (secRows ?? []).find((r) => r.id === sid) as
          | { id: string; parent_id: string | null }
          | undefined;
        // Keep if we don't know the parent (let DB decide) or parent is still valid.
        return !row || !row.parent_id || stillValidParents.has(row.parent_id);
      });
    }
    if (primaryIds.length === 0) {
      throw new Error(
        '[taxonomy:setBusinessTaxonomyCategoriesV2] لا يوجد نشاط رئيسي صالح للحفظ. ' +
          'تم استبعاد الأنشطة غير النشطة أو المؤرشفة. اختر نشاطًا رئيسيًا واحدًا على الأقل.',
      );
    }
  }

  const { error } = await supabase.rpc('set_business_taxonomy_categories_v2', {
    p_business_id: businessId,
    p_entity_type_category_id: payload.entityTypeCategoryId,
    p_primary_activity_category_ids: primaryIds,
    p_secondary_activity_category_ids: secondaryIds,
  });
  if (error) fail(error, 'setBusinessTaxonomyCategoriesV2');
}