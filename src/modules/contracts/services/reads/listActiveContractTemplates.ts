/**
 * CT-2 — Active contract templates read.
 * Wraps the canonical "active templates list" query. Caller controls the
 * select string and ordering column to preserve dashboard vs admin shape
 * (DashboardContracts uses `*` ordered by `sort_order`; admin variants pass
 * a narrow projection ordered by `updated_at`).
 */
import { supabase } from '@/integrations/supabase/client';

export interface ListActiveContractTemplatesArgs {
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  /** When `true`, restricts to `is_active = true` (default). When `false`,
   * no `is_active` filter is applied (admin listings include archived). */
  activeOnly?: boolean;
}

export async function listActiveContractTemplates(
  args: ListActiveContractTemplatesArgs = {},
) {
  const { select = '*', orderBy, activeOnly = true } = args;
  let q = supabase.from('contract_templates').select(select);
  if (activeOnly) q = q.eq('is_active', true);
  if (orderBy) q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true });
  return q;
}
