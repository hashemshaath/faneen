import { supabase } from '@/integrations/supabase/client';

/**
 * Thin write wrappers for `membership_plans` (MEMB-7).
 * Preserve exact payload shape; return raw `{ data, error }`.
 */

export type MembershipPlanInsert = Record<string, unknown>;
export type MembershipPlanUpdate = Record<string, unknown>;

export async function insertMembershipPlan(payload: MembershipPlanInsert) {
  const { data, error } = await supabase.from('membership_plans').insert(payload);
  return { data, error };
}

export async function updateMembershipPlanById({
  id,
  values,
}: {
  id: string;
  values: MembershipPlanUpdate;
}) {
  const { data, error } = await supabase
    .from('membership_plans')
    .update(values)
    .eq('id', id);
  return { data, error };
}