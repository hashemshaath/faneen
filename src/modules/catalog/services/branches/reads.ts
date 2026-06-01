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