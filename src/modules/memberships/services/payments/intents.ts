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
  /** STAB-1A: optional `created_at >= fromIso` filter (admin KPIs). */
  createdFromIso?: string;
  /** STAB-1A: optional `created_at <= toIso` filter (admin KPIs). */
  createdToIso?: string;
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
  if (params.createdFromIso) q = q.gte('created_at', params.createdFromIso);
  if (params.createdToIso) q = q.lte('created_at', params.createdToIso);
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

/**
 * R4F-8I: Latest payment intent for a given membership subscription.
 * Read-only, ordered by created_at desc, limited to 1. Returns raw
 * `{ data, error }` and is safe to call from user-facing surfaces — RLS
 * still scopes visibility to the caller's own subscription rows.
 */
export async function getLatestMembershipPaymentIntentForSubscription<T = unknown>(args: {
  subscriptionId: string;
  select?: string;
}): Promise<{ data: T | null; error: unknown }> {
  const select = args.select ?? '*';
  const { data, error } = await supabase
    .from('membership_payment_intents')
    .select(select)
    .eq('subscription_id', args.subscriptionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data: data as unknown as T | null, error };
}

/**
 * R4F-8J: List payment intents scoped to a single subscription.
 * Read-only, safe defaults, no transformation. Returns raw { data, error }.
 */
export async function listMembershipPaymentIntentsForSubscription<T = unknown>(args: {
  subscriptionId: string;
  select?: string;
  limit?: number;
}): Promise<{ data: T[] | null; error: unknown }> {
  const select =
    args.select ??
    'id, status, amount, currency, invoice_id, confirmed_at, created_at, updated_at, metadata';
  const { data, error } = await supabase
    .from('membership_payment_intents')
    .select(select)
    .eq('subscription_id', args.subscriptionId)
    .order('created_at', { ascending: false })
    .limit(args.limit ?? 10);
  return { data: data as unknown as T[] | null, error };
}

/**
 * R4F-8K: Fetch a single payment intent for invoice / credit-note rendering.
 *
 * Read-only. RLS scopes visibility to the caller's own subscription
 * (admins see all). Default select is the same safe whitelist used
 * across user-facing surfaces — never expose `provider_intent_id`,
 * `idempotency_key`, `processing_error`, or raw provider payloads.
 */
export async function getMembershipPaymentIntentForInvoice<T = unknown>(args: {
  paymentIntentId: string;
  select?: string;
}): Promise<{ data: T | null; error: unknown }> {
  const select =
    args.select ??
    'id, subscription_id, status, amount, currency, invoice_id, confirmed_at, created_at, updated_at, metadata, plan:membership_plans(name_ar, name_en, tier), subscription:membership_subscriptions(id, ref_id, tier, starts_at, expires_at, business:businesses(id, name_ar, name_en, ref_id))';
  const { data, error } = await supabase
    .from('membership_payment_intents')
    .select(select)
    .eq('id', args.paymentIntentId)
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