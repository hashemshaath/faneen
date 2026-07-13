/**
 * T1 — Rental customer-request path.
 *
 * Wraps the small set of operations a CUSTOMER performs on their own rental
 * request/order, plus the provider accept/decline actions on incoming
 * `pending_provider_review` orders. All calls run through RLS — this file
 * never bypasses it.
 *
 * Notification types emitted:
 *   - notification_type: 'rental_request_new'       (→ provider)
 *   - notification_type: 'rental_request_accepted'  (→ customer)
 *   - notification_type: 'rental_request_declined'  (→ customer)
 */
import { supabase } from '@/integrations/supabase/client';
import { createNotification, createNotificationFireAndForget } from '@/modules/notifications';
import type { RentalOrder, ServiceResult } from '../types';

export interface CreateRentalRequestInput {
  provider_business_id: string;
  rental_item_id: string;
  customer_user_id: string;
  quantity: number;
  start_date: string;
  end_date: string;
  total_days: number;
  unit_price: number;
  total_amount: number;
  deposit_amount: number;
  currency: string;
  delivery_required: boolean;
  delivery_fee: number | null;
  delivery_city_id: string | null;
  delivery_district_id: string | null;
  delivery_address_text: string | null;
  request_notes: string | null;
  terms_snapshot?: Record<string, unknown>;
}

/**
 * Insert a new rental order in `pending_provider_review` and notify the
 * provider's owner (best-effort; row still lands even if notify fails).
 */
export async function createRentalRequest(
  input: CreateRentalRequestInput,
): Promise<ServiceResult<RentalOrder>> {
  const insertRow = {
    provider_business_id: input.provider_business_id,
    rental_item_id: input.rental_item_id,
    customer_user_id: input.customer_user_id,
    quantity: input.quantity,
    start_date: input.start_date,
    end_date: input.end_date,
    total_days: input.total_days,
    unit_price: input.unit_price,
    total_amount: input.total_amount,
    deposit_amount: input.deposit_amount,
    currency: input.currency,
    delivery_required: input.delivery_required,
    delivery_fee: input.delivery_fee,
    delivery_city_id: input.delivery_city_id,
    delivery_district_id: input.delivery_district_id,
    delivery_address_text: input.delivery_address_text,
    request_notes: input.request_notes,
    terms_snapshot: (input.terms_snapshot ?? {}) as never,
    status: 'pending_provider_review',
  } as never;

  const { data, error } = await supabase
    .from('rental_orders')
    .insert(insertRow)
    .select('*')
    .single();

  if (error || !data) return { data: null, error: (error as Error) ?? new Error('insert failed') };

  const order = data as unknown as RentalOrder;

  // Best-effort log + provider notification. Never throws.
  try {
    await supabase.from('rental_order_events').insert({
      rental_order_id: order.id,
      event_type: 'request.created',
      payload: { source: 'customer_request_form' } as never,
    });
  } catch { /* best-effort */ }

  try {
    const { data: biz } = await supabase
      .from('businesses')
      .select('user_id, name_ar, name_en')
      .eq('id', input.provider_business_id)
      .maybeSingle();
    const providerUserId = (biz as { user_id?: string | null } | null)?.user_id;
    if (providerUserId) {
      createNotificationFireAndForget(
        {
          user_id: providerUserId,
          notification_type: 'rental_request_new',
          title_ar: `طلب تأجير جديد ${order.ref_id}`,
          title_en: `New rental request ${order.ref_id}`,
          body_ar: 'وصلك طلب تأجير جديد بانتظار مراجعتك.',
          body_en: 'A new rental request is awaiting your review.',
          reference_type: 'rental_order',
          reference_id: order.ref_id,
          action_url: `/dashboard/rentals?order=${encodeURIComponent(order.ref_id)}`,
        },
        '[rentals.request.notify]',
      );
    }
  } catch { /* best-effort */ }

  return { data: order, error: null };
}

export async function listMyRentalOrders(userId: string): Promise<ServiceResult<RentalOrder[]>> {
  const { data, error } = await supabase
    .from('rental_orders')
    .select('*')
    .eq('customer_user_id', userId)
    .order('created_at', { ascending: false });
  return { data: (data as unknown as RentalOrder[] | null) ?? [], error: error as Error | null };
}

export async function getMyRentalOrderByIdOrRef(
  idOrRef: string,
): Promise<ServiceResult<RentalOrder>> {
  // Try UUID first, then ref_id fallback. RLS enforces "own" scoping.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrRef);
  const query = isUuid
    ? supabase.from('rental_orders').select('*').eq('id', idOrRef).maybeSingle()
    : supabase.from('rental_orders').select('*').eq('ref_id', idOrRef).maybeSingle();
  const { data, error } = await query;
  return { data: data as unknown as RentalOrder | null, error: error as Error | null };
}

export async function listOrderEvents(rentalOrderId: string): Promise<
  ServiceResult<Array<{ id: string; event_type: string; payload: unknown; created_at: string }>>
> {
  const { data, error } = await supabase
    .from('rental_order_events')
    .select('id, event_type, payload, created_at')
    .eq('rental_order_id', rentalOrderId)
    .order('created_at', { ascending: true });
  return {
    data:
      (data as unknown as Array<{ id: string; event_type: string; payload: unknown; created_at: string }> | null) ??
      [],
    error: error as Error | null,
  };
}

/* ------------------------ Provider actions ------------------------ */

/**
 * Accept a pending rental request → transitions status to 'active' (the
 * existing "in progress" state — expiry scan already handles the transition
 * to expiring_soon/expired based on end_date). Logs an event + notifies
 * the customer with notification_type: 'rental_request_accepted'.
 */
export async function providerAcceptRentalRequest(
  orderId: string,
): Promise<ServiceResult<RentalOrder>> {
  const { data, error } = await supabase
    .from('rental_orders')
    .update({ status: 'active' } as never)
    .eq('id', orderId)
    .eq('status', 'pending_provider_review')
    .select('*')
    .single();
  if (error || !data) return { data: null, error: (error as Error) ?? new Error('accept failed') };
  const order = data as unknown as RentalOrder;

  try {
    await supabase.from('rental_order_events').insert({
      rental_order_id: order.id,
      event_type: 'request.accepted',
      payload: {} as never,
    });
  } catch { /* best-effort */ }

  if (order.customer_user_id) {
    try {
      await createNotification({
        user_id: order.customer_user_id,
        notification_type: 'rental_request_accepted',
        title_ar: `تم قبول طلب التأجير ${order.ref_id}`,
        title_en: `Rental request ${order.ref_id} accepted`,
        body_ar: 'قبل المزوّد طلبك — يبدأ التأجير حسب التواريخ المتفق عليها.',
        body_en: 'Your rental request was accepted — the rental starts on the agreed dates.',
        reference_type: 'rental_order',
        reference_id: order.ref_id,
        action_url: `/dashboard/my-rentals/${encodeURIComponent(order.ref_id)}`,
      });
    } catch { /* best-effort */ }
  }

  return { data: order, error: null };
}

export async function providerDeclineRentalRequest(
  orderId: string,
  reason: string,
): Promise<ServiceResult<RentalOrder>> {
  const trimmed = (reason || '').trim();
  if (trimmed.length < 3) {
    return { data: null, error: new Error('reason_required') };
  }
  const { data, error } = await supabase
    .from('rental_orders')
    .update({ status: 'declined', decline_reason: trimmed } as never)
    .eq('id', orderId)
    .eq('status', 'pending_provider_review')
    .select('*')
    .single();
  if (error || !data) return { data: null, error: (error as Error) ?? new Error('decline failed') };
  const order = data as unknown as RentalOrder;

  try {
    await supabase.from('rental_order_events').insert({
      rental_order_id: order.id,
      event_type: 'request.declined',
      payload: { reason: trimmed } as never,
    });
  } catch { /* best-effort */ }

  if (order.customer_user_id) {
    try {
      await createNotification({
        user_id: order.customer_user_id,
        notification_type: 'rental_request_declined',
        title_ar: `تم رفض طلب التأجير ${order.ref_id}`,
        title_en: `Rental request ${order.ref_id} declined`,
        body_ar: `السبب: ${trimmed}`,
        body_en: `Reason: ${trimmed}`,
        reference_type: 'rental_order',
        reference_id: order.ref_id,
        action_url: `/dashboard/my-rentals/${encodeURIComponent(order.ref_id)}`,
      });
    } catch { /* best-effort */ }
  }

  return { data: order, error: null };
}