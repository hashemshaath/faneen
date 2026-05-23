import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

/**
 * Thin write wrappers for `membership_upgrade_requests` (MEMB-4).
 * Returns raw Supabase `{ data, error }`.
 */

export type MembershipUpgradeRequestInsert = TablesInsert<'membership_upgrade_requests'>;
export type MembershipUpgradeRequestUpdate = TablesUpdate<'membership_upgrade_requests'>;

export async function insertMembershipUpgradeRequest<T = unknown>(
  payload: MembershipUpgradeRequestInsert,
  options?: { select?: string },
): Promise<{ data: T | null; error: unknown }> {
  const select = options?.select ?? 'id';
  const { data, error } = await supabase
    .from('membership_upgrade_requests')
    .insert(payload)
    .select(select)
    .maybeSingle();
  return { data: (data as unknown as T | null), error };
}

export async function updateMembershipUpgradeRequestById(args: {
  id: string;
  values: MembershipUpgradeRequestUpdate;
}): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('membership_upgrade_requests')
    .update(args.values)
    .eq('id', args.id);
  return { error };
}