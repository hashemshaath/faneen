import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

/**
 * R4F-8C: Thin wrappers for `membership_payment_intents`.
 * Returns raw Supabase `{ data, error }`. Scaffold only — no UI callsites.
 */

export type MembershipPaymentIntentInsert = TablesInsert<'membership_payment_intents'>;
export type MembershipPaymentIntentUpdate = TablesUpdate<'membership_payment_intents'>;

export interface ListMembershipPaymentIntentsOptions {
  subscriptionId?: string;
  userId?: string;
  businessId?: string;
  status?: string;
  select?: string;
  limit?: number;
  order?: { column: string; ascending: boolean };
}

export async function listMembershipPaymentIntents<T = unknown>(
  params: ListMembershipPaymentIntentsOptions = {},
): Promise<{ data: T[] | null; error: unknown }> {
  const select = params.select ?? '*';
  let q = supabase.from('membership_payment_intents').select(select);
  if (params.subscriptionId) q = q.eq('subscription_id', params.subscriptionId);
  if (params.userId) q = q.eq('user_id', params.userId);
  if (params.businessId) q = q.eq('business_id', params.businessId);
  if (params.status) q = q.eq('status', params.status);
  if (params.order) {
    q = q.order(params.order.column, { ascending: params.order.ascending });
  } else {
    q = q.order('created_at', { ascending: false });
  }
  if (params.limit) q = q.limit(params.limit);
  const { data, error } = await q;
  return { data: data as unknown as T[] | null, error };
}

export async function getMembershipPaymentIntentById<T = unknown>(
  id: string,
): Promise<{ data: T | null; error: unknown }> {
  const { data, error } = await supabase
    .from('membership_payment_intents')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return { data: data as unknown as T | null, error };
}

/** Intended for service-role / edge use only. No UI callsites yet. */
export async function createMembershipPaymentIntentRecord<T = unknown>(
  payload: MembershipPaymentIntentInsert,
): Promise<{ data: T | null; error: unknown }> {
  const { data, error } = await supabase
    .from('membership_payment_intents')
    .insert(payload)
    .select('*')
    .maybeSingle();
  return { data: data as unknown as T | null, error };
}

export async function updateMembershipPaymentIntentById(args: {
  id: string;
  values: MembershipPaymentIntentUpdate;
}): Promise<{ error: unknown }> {
  const { error } = await supabase
    .from('membership_payment_intents')
    .update(args.values)
    .eq('id', args.id);
  return { error };
}