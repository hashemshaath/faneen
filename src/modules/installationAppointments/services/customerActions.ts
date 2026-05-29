/**
 * CUSTOMER-EXPERIENCE-2 — Customer-side appointment actions.
 * Anon-callable via the customer tracking-link token. The token is
 * forwarded to the RPC and NEVER stored client-side or logged.
 */
import { supabase } from '@/integrations/supabase/client';
import { CUSTOMER_NOTE_MAX_LEN } from '../types';

export async function confirmAppointment(input: {
  trackingRef: string;
  token: string;
  appointmentRef: string;
}): Promise<{ ok: boolean; error?: Error }> {
  if (!input.trackingRef || !input.token || !input.appointmentRef) {
    return { ok: false, error: new Error('missing_required') };
  }
  const { error } = await supabase.rpc('customer_confirm_appointment', {
    _tracking_ref: input.trackingRef,
    _token: input.token,
    _apt_ref: input.appointmentRef,
  });
  if (error) return { ok: false, error: new Error('confirm_failed') };
  return { ok: true };
}

export async function requestAppointmentReschedule(input: {
  trackingRef: string;
  token: string;
  appointmentRef: string;
  note?: string | null;
}): Promise<{ ok: boolean; error?: Error }> {
  if (!input.trackingRef || !input.token || !input.appointmentRef) {
    return { ok: false, error: new Error('missing_required') };
  }
  const note = (input.note ?? '').slice(0, CUSTOMER_NOTE_MAX_LEN);
  const { error } = await supabase.rpc(
    'customer_request_appointment_reschedule',
    {
      _tracking_ref: input.trackingRef,
      _token: input.token,
      _apt_ref: input.appointmentRef,
      _note: note,
    },
  );
  if (error) return { ok: false, error: new Error('reschedule_failed') };
  return { ok: true };
}