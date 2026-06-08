import { supabase } from '@/integrations/supabase/client';
import type { RentalExtension, RentalExtensionType, ServiceResult } from '../types';
import { notifyRental } from './notifications';

export async function listExtensions(rentalOrderId: string): Promise<ServiceResult<RentalExtension[]>> {
  const { data, error } = await supabase
    .from('rental_extensions').select('*')
    .eq('rental_order_id', rentalOrderId)
    .order('created_at', { ascending: false });
  return { data: (data as RentalExtension[] | null) ?? [], error: error as Error | null };
}

export interface CreateExtensionInput {
  rental_order_id: string;
  extension_type: RentalExtensionType;
  additional_days?: number;
  additional_quantity?: number;
  reason?: string;
  cost?: number;
  effective_from?: string;
}

export async function createExtension(input: CreateExtensionInput): Promise<ServiceResult<RentalExtension>> {
  const { data, error } = await supabase
    .from('rental_extensions').insert({ ...input, status: 'pending' }).select('*').single();
  if (!error && data) {
    const ext = data as RentalExtension;
    // Best-effort audit + notify both sides about the new extension request.
    await supabase.from('rental_order_events').insert({
      rental_order_id: input.rental_order_id,
      event_type: 'extension.requested',
      payload: { ref: ext.ref_id, type: ext.extension_type },
    });
    const { data: order } = await supabase
      .from('rental_orders')
      .select('ref_id, customer_user_id, provider_business_id')
      .eq('id', input.rental_order_id).maybeSingle();
    const orderRef = (order as { ref_id?: string } | null)?.ref_id ?? '';
    const customer = (order as { customer_user_id?: string | null } | null)?.customer_user_id ?? null;
    if (customer && orderRef) {
      notifyRental({ user_id: customer, event: 'rental.extension_requested', rental_order_ref: orderRef });
    }
  }
  return { data: data as RentalExtension | null, error: error as Error | null };
}

export async function approveExtension(id: string, side: 'provider' | 'customer'): Promise<ServiceResult<RentalExtension>> {
  const patch = side === 'provider' ? { approved_by_provider: true } : { approved_by_customer: true };
  const { data, error } = await supabase
    .from('rental_extensions').update(patch).eq('id', id).select('*').single();
  if (data) {
    const ext = data as RentalExtension;
    if (ext.approved_by_customer && ext.approved_by_provider && ext.status !== 'approved') {
      await supabase.from('rental_extensions').update({ status: 'approved' }).eq('id', id);
      // Extend the order end_date if the extension carries additional_days.
      if (ext.additional_days && ext.additional_days > 0) {
        const { data: order } = await supabase
          .from('rental_orders').select('id, ref_id, end_date, customer_user_id')
          .eq('id', ext.rental_order_id).maybeSingle();
        if (order) {
          const newEnd = new Date(
            new Date((order as { end_date: string }).end_date).getTime()
              + ext.additional_days * 24 * 60 * 60 * 1000,
          ).toISOString().slice(0, 10);
          await supabase.from('rental_orders')
            .update({ end_date: newEnd, status: 'extended' })
            .eq('id', ext.rental_order_id);
          await supabase.from('rental_order_events').insert({
            rental_order_id: ext.rental_order_id,
            event_type: 'extension.approved',
            payload: { ref: ext.ref_id, new_end_date: newEnd },
          });
          const cust = (order as { customer_user_id?: string | null; ref_id?: string }).customer_user_id;
          const oref = (order as { ref_id?: string }).ref_id ?? '';
          if (cust && oref) {
            notifyRental({ user_id: cust, event: 'rental.extension_approved', rental_order_ref: oref });
          }
        }
      }
    }
  }
  return { data: data as RentalExtension | null, error: error as Error | null };
}