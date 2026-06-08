import { supabase } from '@/integrations/supabase/client';
import type { RentalExtension, RentalExtensionType, ServiceResult } from '../types';

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
  return { data: data as RentalExtension | null, error: error as Error | null };
}

export async function approveExtension(id: string, side: 'provider' | 'customer'): Promise<ServiceResult<RentalExtension>> {
  const patch = side === 'provider' ? { approved_by_provider: true } : { approved_by_customer: true };
  const { data, error } = await supabase
    .from('rental_extensions').update(patch).eq('id', id).select('*').single();
  if (data && (data as RentalExtension).approved_by_customer && (data as RentalExtension).approved_by_provider) {
    await supabase.from('rental_extensions').update({ status: 'approved' }).eq('id', id);
  }
  return { data: data as RentalExtension | null, error: error as Error | null };
}