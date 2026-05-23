import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

/**
 * Thin write wrappers for `membership_plans` (MEMB-7).
 * Preserve exact payload shape; return raw `{ data, error }`.
 */

export type MembershipPlanInsert = Database['public']['Tables']['membership_plans']['Insert'];
export type MembershipPlanUpdate = Database['public']['Tables']['membership_plans']['Update'];

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