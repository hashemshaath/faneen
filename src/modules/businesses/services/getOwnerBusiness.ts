import { supabase } from '@/integrations/supabase/client';

/**
 * Canonical wrapper for the owner-business lookup pattern:
 *
 *   supabase.from('businesses')
 *     .select(<select>)
 *     .eq('user_id', userId)
 *     [.eq('is_active', true)?]
 *     [.order(...)?]
 *     [.limit(n)?]
 *     .maybeSingle()
 *
 * Returns the raw `{ data, error }` shape. Never throws. Used across the
 * dashboard, AuthContext provider-access probe, and account diagnostics.
 *
 * Each caller must pass its current `select` string verbatim so the
 * Supabase column shape stays byte-identical to the pre-migration code.
 */
export interface GetOwnerBusinessOptions {
  userId: string;
  select?: string;
  activeOnly?: boolean;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
}

export async function getOwnerBusiness<T = unknown>(
  options: GetOwnerBusinessOptions,
): Promise<{ data: T | null; error: unknown }> {
  const { userId, select = 'id', activeOnly, orderBy, limit } = options;
  let query = supabase.from('businesses').select(select).eq('user_id', userId);
  if (activeOnly) query = query.eq('is_active', true);
  if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
  if (typeof limit === 'number') query = query.limit(limit);
  const { data, error } = await query.maybeSingle();
  return { data: (data as unknown as T | null), error };
}

/**
 * Convenience: equivalent to `getOwnerBusiness({ userId, select: 'id' })`
 * with no extra filters. Use when only the business id is needed.
 */
export async function getOwnerBusinessId(
  userId: string,
): Promise<{ data: { id: string } | null; error: unknown }> {
  return getOwnerBusiness<{ id: string }>({ userId, select: 'id' });
}