import { supabase } from '@/integrations/supabase/client';

/**
 * Thin read wrappers for `business_branches` (CAT-2).
 *
 * DB-GOVERNANCE-2 — public/anonymous consumers (e.g. BusinessProfile) must
 * route through the `business_branches_public` view, which enforces parent
 * business approval (active + published + non-demo) and `is_active = true`.
 * Owner/staff/admin consumers continue to read from `business_branches`.
 */

export interface ListBranchesByBusinessOptions {
  businessId: string;
  select?: string;
  activeOnly?: boolean;
  /** Ordered list of order clauses applied in sequence. */
  order?: Array<{ column: string; ascending?: boolean }>;
  /**
   * 'private' (default) reads `business_branches` and respects table RLS
   * (owner / staff / admin). 'public' reads `business_branches_public` and
   * is safe for anonymous BusinessProfile consumers. Only columns exposed
   * by the public view may be selected when source = 'public'.
   */
  source?: 'private' | 'public';
}

export async function listBranchesByBusiness<T = unknown>({
  businessId,
  select = '*',
  activeOnly = false,
  order = [],
  source = 'private',
}: ListBranchesByBusinessOptions): Promise<{ data: T[] | null; error: unknown }> {
  const table = source === 'public' ? 'business_branches_public' : 'business_branches';
  // PostgREST table name is fixed at compile time for generated types; cast for runtime.
  let q = supabase
    .from(table as 'business_branches')
    .select(select)
    .eq('business_id', businessId);
  // business_branches_public already filters is_active = true; only apply on private.
  if (activeOnly && source === 'private') q = q.eq('is_active', true);
  for (const o of order) q = q.order(o.column, { ascending: o.ascending ?? true });
  const { data, error } = await q;
  return { data: data as unknown as T[] | null, error };
}

// ---------- BRANCHES-PRO additional readers ----------

/** Fetch a single branch by id (private, owner/staff RLS). */
export async function getBranchById<T = unknown>(
  id: string,
  select = '*',
): Promise<{ data: T | null; error: unknown }> {
  const { data, error } = await supabase
    .from('business_branches')
    .select(select)
    .eq('id', id)
    .maybeSingle();
  return { data: data as unknown as T | null, error };
}

/** Fetch a public branch by business_id + slug for the public BranchDetail page. */
export async function getPublicBranchBySlug<T = unknown>(
  businessId: string,
  slug: string,
  select = '*',
): Promise<{ data: T | null; error: unknown }> {
  const { data, error } = await supabase
    .from('business_branches_public' as 'business_branches')
    .select(select)
    .eq('business_id', businessId)
    .eq('slug', slug)
    .maybeSingle();
  return { data: data as unknown as T | null, error };
}

/** List service_id values linked to a branch. */
export async function listBranchServiceIds(branchId: string): Promise<{ data: string[] | null; error: unknown }> {
   
  const { data, error } = await (supabase as any)
    .from('branch_services')
    .select('service_id')
    .eq('branch_id', branchId);
  const ids = (data as Array<{ service_id: string }> | null)?.map(r => r.service_id) ?? null;
  return { data: ids, error };
}

/** List promotion_id values linked to a branch. */
export async function listBranchPromotionIds(branchId: string): Promise<{ data: string[] | null; error: unknown }> {
   
  const { data, error } = await (supabase as any)
    .from('branch_promotions')
    .select('promotion_id')
    .eq('branch_id', branchId);
  const ids = (data as Array<{ promotion_id: string }> | null)?.map(r => r.promotion_id) ?? null;
  return { data: ids, error };
}