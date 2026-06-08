import { supabase } from '@/integrations/supabase/client';
import type { RentalOrder, RentalOrderStatus, ServiceResult } from '../types';

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
    .from('rental_order_events').insert({ rental_order_id: rentalOrderId, event_type: eventType, payload });
  return { data: error ? null : true, error: error as Error | null };
}