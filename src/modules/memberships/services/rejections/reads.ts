import { supabase } from '@/integrations/supabase/client';

/**
 * Thin read wrappers for `membership_upgrade_rejections` (MEMB-4).
 *
 * The admin rejections page composes a query with sortable columns,
 * count-exact pagination, and a shared `applyFilters(qb)` callback.
 * To preserve exact behavior we expose a builder-callback API that
 * mirrors the original chain without taking over its filter logic.
 */

// Supabase chainable builder typing is intentionally loose.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Builder = any;

export interface QueryMembershipUpgradeRejectionsOptions {
  select: string;
  count?: 'exact' | 'planned' | 'estimated';
  orderBy?: { column: string; ascending: boolean; nullsFirst?: boolean };
  range?: { from: number; to: number };
  limit?: number;
  applyFilters?: (q: Builder) => Builder;
}

export async function queryMembershipUpgradeRejections<T = unknown>(
  options: QueryMembershipUpgradeRejectionsOptions,
): Promise<{ data: T[] | null; count: number | null; error: unknown }> {
  const { select, count, orderBy, range, limit, applyFilters } = options;
  let q: Builder = supabase
    .from('membership_upgrade_rejections')
    .select(select, count ? { count } : undefined);
  if (orderBy) {
    q = q.order(orderBy.column, {
      ascending: orderBy.ascending,
      nullsFirst: orderBy.nullsFirst,
    });
  }
  if (range) q = q.range(range.from, range.to);
  if (typeof limit === 'number') q = q.limit(limit);
  if (applyFilters) q = applyFilters(q);
  const { data, count: c, error } = await q;
  return { data: (data as unknown as T[] | null), count: c ?? null, error };
}