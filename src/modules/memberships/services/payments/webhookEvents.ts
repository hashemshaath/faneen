import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';

/**
 * R4F-8C: Thin wrappers for `membership_payment_webhook_events`.
 * Scaffold only — no UI callsites. Intended for future edge/webhook use.
 */

export type MembershipPaymentWebhookEventInsert =
  TablesInsert<'membership_payment_webhook_events'>;

export interface ListMembershipPaymentWebhookEventsOptions {
  provider?: string;
  eventType?: string;
  processedOnly?: boolean;
  unprocessedOnly?: boolean;
  select?: string;
  limit?: number;
  order?: { column: string; ascending: boolean };
}

export async function listMembershipPaymentWebhookEvents<T = unknown>(
  params: ListMembershipPaymentWebhookEventsOptions = {},
): Promise<{ data: T[] | null; error: unknown }> {
  const select = params.select ?? '*';
  let q = supabase.from('membership_payment_webhook_events').select(select);
  if (params.provider) q = q.eq('provider', params.provider);
  if (params.eventType) q = q.eq('event_type', params.eventType);
  if (params.processedOnly) q = q.not('processed_at', 'is', null);
  if (params.unprocessedOnly) q = q.is('processed_at', null);
  if (params.order) {
    q = q.order(params.order.column, { ascending: params.order.ascending });
  } else {
    q = q.order('created_at', { ascending: false });
  }
  if (params.limit) q = q.limit(params.limit);
  const { data, error } = await q;
  return { data: data as unknown as T[] | null, error };
}

export async function createMembershipPaymentWebhookEventRecord<T = unknown>(
  payload: MembershipPaymentWebhookEventInsert,
): Promise<{ data: T | null; error: unknown }> {
  const { data, error } = await supabase
    .from('membership_payment_webhook_events')
    .insert(payload)
    .select('*')
    .maybeSingle();
  return { data: data as unknown as T | null, error };
}