import { supabase } from '@/integrations/supabase/client';
import type { ProcurementRfqRow, ProcurementRfqStatus } from '../types';
import { updateProcurementRequestStatus } from './procurementRequests';

const SELECT =
  'id, business_id, procurement_request_id, rfq_number, status, due_at, created_by, created_at, updated_at';

export interface CreateRfqInput {
  business_id: string;
  procurement_request_id: string;
  created_by: string;
  due_at?: string | null;
  /** When true, also flips the parent request from `requested` → `rfq_sent`. */
  advanceRequestStatus?: boolean;
}

export async function createRfqFromRequest(
  input: CreateRfqInput,
): Promise<{ data: ProcurementRfqRow | null; error: unknown }> {
  const { data, error } = await supabase
    .from('procurement_rfqs')
    .insert({
      business_id: input.business_id,
      procurement_request_id: input.procurement_request_id,
      created_by: input.created_by,
      due_at: input.due_at ?? null,
      status: 'draft',
    })
    .select(SELECT)
    .maybeSingle();
  if (error || !data) return { data: null, error };
  if (input.advanceRequestStatus) {
    // best-effort, ignore failure
    await updateProcurementRequestStatus({
      id: input.procurement_request_id,
      from: 'requested',
      to: 'rfq_sent',
    });
  }
  return { data: data as ProcurementRfqRow, error: null };
}

export interface ListRfqsOptions {
  businessId: string;
  procurementRequestId?: string;
  status?: ProcurementRfqStatus | 'all';
  limit?: number;
}

export async function listRfqs(
  options: ListRfqsOptions,
): Promise<{ data: ProcurementRfqRow[] | null; error: unknown }> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  let q = supabase
    .from('procurement_rfqs')
    .select(SELECT)
    .eq('business_id', options.businessId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (options.procurementRequestId)
    q = q.eq('procurement_request_id', options.procurementRequestId);
  if (options.status && options.status !== 'all') q = q.eq('status', options.status);
  const { data, error } = await q;
  return { data: (data as ProcurementRfqRow[] | null) ?? null, error };
}

export async function getRfqById(
  id: string,
): Promise<{ data: ProcurementRfqRow | null; error: unknown }> {
  const { data, error } = await supabase
    .from('procurement_rfqs')
    .select(SELECT)
    .eq('id', id)
    .maybeSingle();
  return { data: (data as ProcurementRfqRow | null) ?? null, error };
}

export async function updateRfqStatus(
  id: string,
  status: ProcurementRfqStatus,
): Promise<{ data: ProcurementRfqRow | null; error: unknown }> {
  const { data, error } = await supabase
    .from('procurement_rfqs')
    .update({ status })
    .eq('id', id)
    .select(SELECT)
    .maybeSingle();
  return { data: (data as ProcurementRfqRow | null) ?? null, error };
}