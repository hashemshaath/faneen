import { supabase } from '@/integrations/supabase/client';
import type { RentalOrder, RentalOrderStatus, ServiceResult } from '../types';
import { notifyRental } from './notifications';

export async function listOrdersForProvider(providerBusinessId: string): Promise<ServiceResult<RentalOrder[]>> {
  const { data, error } = await supabase
    .from('rental_orders').select('*')
    .eq('provider_business_id', providerBusinessId)
    .order('end_date', { ascending: true });
  return { data: (data as RentalOrder[] | null) ?? [], error: error as Error | null };
}

export async function listOrdersForCustomer(userId: string): Promise<ServiceResult<RentalOrder[]>> {
  const { data, error } = await supabase
    .from('rental_orders').select('*')
    .eq('customer_user_id', userId)
    .order('end_date', { ascending: true });
  return { data: (data as RentalOrder[] | null) ?? [], error: error as Error | null };
}

export async function getOrderById(id: string): Promise<ServiceResult<RentalOrder>> {
  const { data, error } = await supabase.from('rental_orders').select('*').eq('id', id).maybeSingle();
  return { data: data as RentalOrder | null, error: error as Error | null };
}

export interface CreateOrderInput {
  provider_business_id: string;
  rental_item_id: string;
  customer_user_id?: string;
  customer_business_id?: string;
  client_site_id?: string;
  project_id?: string;
  work_order_id?: string;
  quantity: number;
  start_date: string;
  end_date: string;
  unit_price: number;
  deposit_amount?: number;
  notes?: string;
}

export async function createOrder(input: CreateOrderInput): Promise<ServiceResult<RentalOrder>> {
  const { data, error } = await supabase
    .from('rental_orders').insert({ ...input, status: 'active' }).select('*').single();
  return { data: data as RentalOrder | null, error: error as Error | null };
}

export async function updateOrderStatus(id: string, status: RentalOrderStatus): Promise<ServiceResult<RentalOrder>> {
  const { data, error } = await supabase
    .from('rental_orders').update({ status }).eq('id', id).select('*').single();
  return { data: data as RentalOrder | null, error: error as Error | null };
}

export async function logOrderEvent(rentalOrderId: string, eventType: string, payload: Record<string, unknown> = {}): Promise<ServiceResult<true>> {
  const { error } = await supabase
    .from('rental_order_events')
    .insert({ rental_order_id: rentalOrderId, event_type: eventType, payload: payload as never });
  return { data: error ? null : true, error: error as Error | null };
}

/**
 * Close an order safely. Preserves original start/end dates (history) and
 * writes an audit event. Idempotent: closing an already-closed order is a
 * no-op with success.
 */
export async function closeOrder(id: string): Promise<ServiceResult<RentalOrder>> {
  const { data: current } = await supabase
    .from('rental_orders').select('*').eq('id', id).maybeSingle();
  const order = current as RentalOrder | null;
  if (!order) return { data: null, error: new Error('Order not found') };
  if (order.status === 'closed') return { data: order, error: null };

  const { data, error } = await supabase
    .from('rental_orders').update({ status: 'closed' }).eq('id', id).select('*').single();
  if (!error) {
    await logOrderEvent(id, 'order.closed', { previous_status: order.status });
    if (order.customer_user_id) {
      notifyRental({
        user_id: order.customer_user_id,
        event: 'rental.closed',
        rental_order_ref: order.ref_id,
      });
    }
  }
  return { data: data as RentalOrder | null, error: error as Error | null };
}

/**
 * Renew an order: creates a fresh active order anchored to the previous
 * order's end_date. Preserves the original order intact (history) and links
 * the new one via terms_snapshot.renewed_from_ref.
 */
export async function renewOrder(
  id: string,
  additionalDays: number,
): Promise<ServiceResult<RentalOrder>> {
  if (additionalDays <= 0) return { data: null, error: new Error('additionalDays must be > 0') };
  const { data: current } = await supabase
    .from('rental_orders').select('*').eq('id', id).maybeSingle();
  const prev = current as RentalOrder | null;
  if (!prev) return { data: null, error: new Error('Order not found') };

  const newStart = prev.end_date;
  const newEnd = new Date(
    new Date(prev.end_date).getTime() + additionalDays * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from('rental_orders')
    .insert({
      provider_business_id: prev.provider_business_id,
      customer_user_id: prev.customer_user_id,
      customer_business_id: prev.customer_business_id,
      project_id: prev.project_id,
      work_order_id: prev.work_order_id,
      client_site_id: prev.client_site_id,
      rental_item_id: prev.rental_item_id,
      quantity: prev.quantity,
      start_date: newStart,
      end_date: newEnd,
      unit_price: prev.unit_price,
      deposit_amount: prev.deposit_amount,
      status: 'active',
      terms_snapshot: { renewed_from_ref: prev.ref_id, additional_days: additionalDays },
    })
    .select('*').single();

  if (!error && data) {
    await supabase.from('rental_orders').update({ status: 'renewed' }).eq('id', id);
    await logOrderEvent(id, 'order.renewed', {
      additional_days: additionalDays,
      new_order_ref: (data as RentalOrder).ref_id,
    });
  }
  return { data: data as RentalOrder | null, error: error as Error | null };
}