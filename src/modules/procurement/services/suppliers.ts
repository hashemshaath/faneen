import { supabase } from '@/integrations/supabase/client';
import type {
  ProcurementSupplierRow,
  ProcurementSupplierStatus,
} from '../types';

const SELECT =
  'id, business_id, name, contact_name, phone, email, status, created_at, updated_at';

export interface CreateSupplierInput {
  business_id: string;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
}

export async function createSupplier(
  input: CreateSupplierInput,
): Promise<{ data: ProcurementSupplierRow | null; error: unknown }> {
  const name = (input.name ?? '').trim();
  if (!name) return { data: null, error: new Error('name_required') };
  const { data, error } = await supabase
    .from('procurement_suppliers')
    .insert({
      business_id: input.business_id,
      name,
      contact_name: input.contact_name ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      status: 'active',
    })
    .select(SELECT)
    .maybeSingle();
  return { data: (data as ProcurementSupplierRow | null) ?? null, error };
}

export interface ListSuppliersOptions {
  businessId: string;
  status?: ProcurementSupplierStatus | 'all';
  limit?: number;
}

export async function listSuppliers(
  options: ListSuppliersOptions,
): Promise<{ data: ProcurementSupplierRow[] | null; error: unknown }> {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  let q = supabase
    .from('procurement_suppliers')
    .select(SELECT)
    .eq('business_id', options.businessId)
    .order('name', { ascending: true })
    .limit(limit);
  const status = options.status ?? 'active';
  if (status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  return { data: (data as ProcurementSupplierRow[] | null) ?? null, error };
}

export async function updateSupplierStatus(
  id: string,
  status: ProcurementSupplierStatus,
): Promise<{ data: ProcurementSupplierRow | null; error: unknown }> {
  const { data, error } = await supabase
    .from('procurement_suppliers')
    .update({ status })
    .eq('id', id)
    .select(SELECT)
    .maybeSingle();
  return { data: (data as ProcurementSupplierRow | null) ?? null, error };
}