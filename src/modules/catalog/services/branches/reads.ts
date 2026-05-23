import { supabase } from '@/integrations/supabase/client';

/**
 * Thin read wrappers for `business_branches` (CAT-2).
 */

export interface ListBranchesByBusinessOptions {
  businessId: string;
  select?: string;
  activeOnly?: boolean;
  /** Ordered list of order clauses applied in sequence. */
  order?: Array<{ column: string; ascending?: boolean }>;
}

export async function listBranchesByBusiness({
  businessId,
  select = '*',
  activeOnly = false,
  order = [],
}: ListBranchesByBusinessOptions) {
  let q = supabase.from('business_branches').select(select).eq('business_id', businessId);
  if (activeOnly) q = q.eq('is_active', true);
  for (const o of order) q = q.order(o.column, { ascending: o.ascending ?? true });
  return await q;
}