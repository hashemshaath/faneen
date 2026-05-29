import { supabase } from '@/integrations/supabase/client';
import type {
  ProcurementRequestRow,
  ProcurementRequestStatus,
} from '../types';
import { isValidProcurementRequestTransition } from '../types';

const SELECT =
  'id, business_id, work_order_id, title, description, status, needed_by, created_by, created_at, updated_at';

export interface CreateProcurementRequestInput {
  business_id: string;
  created_by: string;
  title: string;
  description?: string | null;
  work_order_id?: string | null;
  needed_by?: string | null;
}

export async function createProcurementRequest(
  input: CreateProcurementRequestInput,
): Promise<{ data: ProcurementRequestRow | null; error: unknown }> {
  const title = (input.title ?? '').trim();
  if (!title) return { data: null, error: new Error('title_required') };
  if (title.length > 200) return { data: null, error: new Error('title_too_long') };

  const { data, error } = await supabase
    .from('procurement_requests')
    .insert({
      business_id: input.business_id,
      created_by: input.created_by,
      title,
      description: input.description ?? null,
      work_order_id: input.work_order_id ?? null,
      needed_by: input.needed_by ?? null,
      status: 'draft',
    })
    .select(SELECT)
    .maybeSingle();
  return { data: (data as ProcurementRequestRow | null) ?? null, error };
}

export interface ListProcurementRequestsOptions {
  businessId: string;
  workOrderId?: string;
  status?: ProcurementRequestStatus | 'all';
  limit?: number;
}

export async function listProcurementRequests(
  options: ListProcurementRequestsOptions,
): Promise<{ data: ProcurementRequestRow[] | null; error: unknown }> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  let q = supabase
    .from('procurement_requests')
    .select(SELECT)
    .eq('business_id', options.businessId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (options.workOrderId) q = q.eq('work_order_id', options.workOrderId);
  if (options.status && options.status !== 'all') q = q.eq('status', options.status);
  const { data, error } = await q;
  return { data: (data as ProcurementRequestRow[] | null) ?? null, error };
}

export async function getProcurementRequestById(
  id: string,
): Promise<{ data: ProcurementRequestRow | null; error: unknown }> {
  const { data, error } = await supabase
    .from('procurement_requests')
    .select(SELECT)
    .eq('id', id)
    .maybeSingle();
  return { data: (data as ProcurementRequestRow | null) ?? null, error };
}

export interface UpdateProcurementRequestStatusInput {
  id: string;
  from: ProcurementRequestStatus;
  to: ProcurementRequestStatus;
}

export async function updateProcurementRequestStatus(
  input: UpdateProcurementRequestStatusInput,
): Promise<{ data: ProcurementRequestRow | null; error: unknown }> {
  if (!isValidProcurementRequestTransition(input.from, input.to)) {
    return { data: null, error: new Error('invalid_status_transition') };
  }
  const { data, error } = await supabase
    .from('procurement_requests')
    .update({ status: input.to })
    .eq('id', input.id)
    .eq('status', input.from)
    .select(SELECT)
    .maybeSingle();
  return { data: (data as ProcurementRequestRow | null) ?? null, error };
}