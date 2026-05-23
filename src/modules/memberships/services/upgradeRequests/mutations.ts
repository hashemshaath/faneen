import { supabase } from '@/integrations/supabase/client';

/**
 * Thin write wrappers for `membership_upgrade_requests` (MEMB-4).
 * Returns raw Supabase `{ data, error }`.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MembershipUpgradeRequestInsert = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MembershipUpgradeRequestUpdate = Record<string, any>;

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