/**
 * CUSTOMER-EXPERIENCE-2 — Provider-side appointment RPC wrappers.
 * All calls go through SECURITY DEFINER functions; no direct table writes.
 */
import { supabase } from '@/integrations/supabase/client';
import type { InstallationAppointmentRow } from '../types';

function err(code: string): { ok: false; error: Error } {
  return { ok: false, error: new Error(code) };
}

export async function createInstallationAppointment(input: {
  workOrderId: string;
  scheduledDate: string; // YYYY-MM-DD
  timeWindow?: string | null;
  internalNote?: string | null;
  customerTrackingLinkId?: string | null;
}): Promise<
  | { ok: true; refId: string; id: string }
  | { ok: false; error: Error }
> {
  if (!input.workOrderId) return err('missing_work_order');
  if (!input.scheduledDate) return err('missing_scheduled_date');
  const { data, error } = await supabase.rpc('create_installation_appointment', {
    _work_order_id: input.workOrderId,
    _scheduled_date: input.scheduledDate,
    _time_window: input.timeWindow ?? null,
    _internal_note: input.internalNote ?? null,
    _customer_tracking_link_id: input.customerTrackingLinkId ?? null,
  });
  if (error) return { ok: false, error: new Error('create_failed') };
  const row = data as unknown as { id: string; ref_id: string } | null;
  if (!row) return err('create_failed');
  return { ok: true, id: row.id, refId: row.ref_id };
}

export async function updateInstallationAppointment(input: {
  refId: string;
  scheduledDate?: string | null;
  timeWindow?: string | null;
  internalNote?: string | null;
}): Promise<{ ok: boolean; error?: Error }> {
  if (!input.refId) return { ok: false, error: new Error('missing_ref') };
  const { error } = await supabase.rpc('update_installation_appointment', {
    _ref_id: input.refId,
    _scheduled_date: input.scheduledDate ?? null,
    _time_window: input.timeWindow ?? null,
    _internal_note: input.internalNote ?? null,
  });
  if (error) return { ok: false, error: new Error('update_failed') };
  return { ok: true };
}

export async function cancelInstallationAppointment(
  refId: string,
): Promise<{ ok: boolean; error?: Error }> {
  if (!refId) return { ok: false, error: new Error('missing_ref') };
  const { error } = await supabase.rpc('cancel_installation_appointment', {
    _ref_id: refId,
  });
  if (error) return { ok: false, error: new Error('cancel_failed') };
  return { ok: true };
}

export async function completeInstallationAppointment(
  refId: string,
): Promise<{ ok: boolean; error?: Error }> {
  if (!refId) return { ok: false, error: new Error('missing_ref') };
  const { error } = await supabase.rpc('complete_installation_appointment', {
    _ref_id: refId,
  });
  if (error) {
    const msg = (error as { message?: string }).message ?? '';
    if (msg.includes('appointment_cancelled')) {
      return { ok: false, error: new Error('appointment_cancelled') };
    }
    return { ok: false, error: new Error('complete_failed') };
  }
  return { ok: true };
}

export async function getInstallationAppointmentByWorkOrder(
  workOrderId: string,
): Promise<{
  data: InstallationAppointmentRow | null;
  error: Error | null;
}> {
  if (!workOrderId) return { data: null, error: new Error('missing_work_order') };
  const { data, error } = await supabase
    .from('installation_appointments')
    .select(
      'id, ref_id, business_id, work_order_id, customer_tracking_link_id, scheduled_date, time_window, status, customer_confirmation_status, customer_note, internal_note, confirmed_at, completed_at, created_at, updated_at',
    )
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return { data: null, error: new Error('fetch_failed') };
  return {
    data: (data as unknown as InstallationAppointmentRow | null) ?? null,
    error: null,
  };
}

export async function listInstallationAppointmentsForBusiness(input: {
  businessId: string;
  limit?: number;
}): Promise<{ data: InstallationAppointmentRow[]; error: Error | null }> {
  if (!input.businessId) return { data: [], error: new Error('missing_business') };
  const { data, error } = await supabase
    .from('installation_appointments')
    .select(
      'id, ref_id, business_id, work_order_id, customer_tracking_link_id, scheduled_date, time_window, status, customer_confirmation_status, customer_note, internal_note, confirmed_at, completed_at, created_at, updated_at',
    )
    .eq('business_id', input.businessId)
    .order('scheduled_date', { ascending: true })
    .limit(input.limit ?? 200);
  if (error) return { data: [], error: new Error('list_failed') };
  return {
    data: (data as unknown as InstallationAppointmentRow[]) ?? [],
    error: null,
  };
}