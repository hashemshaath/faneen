/**
 * CUSTOMER-EXPERIENCE-3 — Provider/admin closure, evidence, warranty.
 * All writes go through SECURITY DEFINER RPCs. No direct table writes.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  ProjectClosureRow,
  ProjectDeliveryEvidenceRow,
  CustomerFeedbackRow,
  CustomerNpsResponseRow,
  WorkOrderWarrantyRow,
} from '../types';

function err(code: string): { ok: false; error: Error } {
  return { ok: false, error: new Error(code) };
}

export async function createProjectClosure(input: {
  workOrderId: string;
  completionDate?: string | null;
}): Promise<
  | { ok: true; id: string; refId: string }
  | { ok: false; error: Error }
> {
  if (!input.workOrderId) return err('missing_work_order');
  const { data, error } = await supabase.rpc('create_project_closure', {
    _work_order_id: input.workOrderId,
    _completion_date: input.completionDate ?? undefined,
  });
  if (error) return err('create_failed');
  const row = data as unknown as { id: string; ref_id: string } | null;
  if (!row) return err('create_failed');
  return { ok: true, id: row.id, refId: row.ref_id };
}

export async function addDeliveryEvidence(input: {
  closureId: string;
  attachmentId?: string | null;
  publicImageUrl?: string | null;
  captionAr?: string | null;
  captionEn?: string | null;
  isCustomerVisible?: boolean;
}): Promise<
  | { ok: true; id: string; refId: string }
  | { ok: false; error: Error }
> {
  if (!input.closureId) return err('missing_closure');
  if (!input.attachmentId && !input.publicImageUrl) {
    return err('missing_image_source');
  }
  const { data, error } = await supabase.rpc('add_project_delivery_evidence', {
    _closure_id: input.closureId,
    _attachment_id: input.attachmentId ?? undefined,
    _public_image_url: input.publicImageUrl ?? undefined,
    _caption_ar: input.captionAr ?? undefined,
    _caption_en: input.captionEn ?? undefined,
    _is_customer_visible: input.isCustomerVisible ?? true,
  });
  if (error) return err('add_failed');
  const row = data as unknown as { id: string; ref_id: string } | null;
  if (!row) return err('add_failed');
  return { ok: true, id: row.id, refId: row.ref_id };
}

export async function startWorkOrderWarranty(input: {
  closureId: string;
  months?: number;
  warrantyType?: string;
  notes?: string | null;
}): Promise<
  | { ok: true; id: string; refId: string }
  | { ok: false; error: Error }
> {
  if (!input.closureId) return err('missing_closure');
  const { data, error } = await supabase.rpc('start_work_order_warranty', {
    _closure_id: input.closureId,
    _months: input.months ?? 12,
    _warranty_type: input.warrantyType ?? 'standard',
    _notes: input.notes ?? undefined,
  });
  if (error) return err('start_failed');
  const row = data as unknown as { id: string; ref_id: string } | null;
  if (!row) return err('start_failed');
  return { ok: true, id: row.id, refId: row.ref_id };
}

export async function getProjectClosureByWorkOrder(
  workOrderId: string,
): Promise<{ data: ProjectClosureRow | null; error: Error | null }> {
  if (!workOrderId) return { data: null, error: new Error('missing_work_order') };
  const { data, error } = await supabase
    .from('project_closures')
    .select(
      'id, ref_id, business_id, work_order_id, closure_status, completion_date, confirmed_at, issue_reported_at, issue_text, warranty_start_date, warranty_end_date, created_at, updated_at',
    )
    .eq('work_order_id', workOrderId)
    .maybeSingle();
  if (error) return { data: null, error: new Error('fetch_failed') };
  return {
    data: (data as unknown as ProjectClosureRow | null) ?? null,
    error: null,
  };
}

export async function listDeliveryEvidenceForClosure(
  closureId: string,
): Promise<{ data: ProjectDeliveryEvidenceRow[]; error: Error | null }> {
  if (!closureId) return { data: [], error: new Error('missing_closure') };
  const { data, error } = await supabase
    .from('project_delivery_evidence')
    .select(
      'id, ref_id, closure_id, business_id, attachment_id, public_image_url, caption_ar, caption_en, is_customer_visible, created_at',
    )
    .eq('closure_id', closureId)
    .order('created_at', { ascending: true });
  if (error) return { data: [], error: new Error('list_failed') };
  return {
    data: (data as unknown as ProjectDeliveryEvidenceRow[]) ?? [],
    error: null,
  };
}

export async function listWarrantyByWorkOrder(
  workOrderId: string,
): Promise<{ data: WorkOrderWarrantyRow | null; error: Error | null }> {
  if (!workOrderId) return { data: null, error: new Error('missing_work_order') };
  const { data, error } = await supabase
    .from('work_order_warranties')
    .select(
      'id, ref_id, business_id, work_order_id, closure_id, start_date, end_date, warranty_type, notes, status, created_at, updated_at',
    )
    .eq('work_order_id', workOrderId)
    .maybeSingle();
  if (error) return { data: null, error: new Error('fetch_failed') };
  return {
    data: (data as unknown as WorkOrderWarrantyRow | null) ?? null,
    error: null,
  };
}

/** Lightweight list helpers for the Operations Center. */
export async function listProjectClosuresForBusiness(
  businessId: string,
  limit = 200,
): Promise<{ data: ProjectClosureRow[]; error: Error | null }> {
  if (!businessId) return { data: [], error: new Error('missing_business') };
  const { data, error } = await supabase
    .from('project_closures')
    .select(
      'id, ref_id, business_id, work_order_id, closure_status, completion_date, confirmed_at, issue_reported_at, issue_text, warranty_start_date, warranty_end_date, created_at, updated_at',
    )
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { data: [], error: new Error('list_failed') };
  return { data: (data as unknown as ProjectClosureRow[]) ?? [], error: null };
}

export async function listCustomerFeedbackForBusiness(
  businessId: string,
  limit = 200,
): Promise<{ data: CustomerFeedbackRow[]; error: Error | null }> {
  if (!businessId) return { data: [], error: new Error('missing_business') };
  const { data, error } = await supabase
    .from('customer_feedback')
    .select(
      'id, ref_id, business_id, work_order_id, closure_id, rating, feedback_text, would_recommend, created_at',
    )
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { data: [], error: new Error('list_failed') };
  return { data: (data as unknown as CustomerFeedbackRow[]) ?? [], error: null };
}

export async function listCustomerNpsForBusiness(
  businessId: string,
  limit = 200,
): Promise<{ data: CustomerNpsResponseRow[]; error: Error | null }> {
  if (!businessId) return { data: [], error: new Error('missing_business') };
  const { data, error } = await supabase
    .from('customer_nps_responses')
    .select('id, business_id, work_order_id, closure_id, score, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { data: [], error: new Error('list_failed') };
  return { data: (data as unknown as CustomerNpsResponseRow[]) ?? [], error: null };
}

export async function listWarrantiesForBusiness(
  businessId: string,
  limit = 200,
): Promise<{ data: WorkOrderWarrantyRow[]; error: Error | null }> {
  if (!businessId) return { data: [], error: new Error('missing_business') };
  const { data, error } = await supabase
    .from('work_order_warranties')
    .select(
      'id, ref_id, business_id, work_order_id, closure_id, start_date, end_date, warranty_type, notes, status, created_at, updated_at',
    )
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return { data: [], error: new Error('list_failed') };
  return { data: (data as unknown as WorkOrderWarrantyRow[]) ?? [], error: null };
}