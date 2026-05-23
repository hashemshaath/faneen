import { supabase } from '@/integrations/supabase/client';

export interface AdminRevealLeadContactBody {
  lead_id: string;
  note?: string;
  override_credit_check?: boolean;
}

/**
 * L-4: invoke the `admin-reveal-lead-contact` edge function.
 * Preserves AdminQuoteRequestDetails semantics exactly:
 *   supabase.functions.invoke('admin-reveal-lead-contact', { body })
 * Returns the raw { data, error } result. Does not transform body
 * or response. Does not throw — callers preserve existing handling.
 */
export async function adminRevealLeadContact(body: AdminRevealLeadContactBody) {
  return await supabase.functions.invoke('admin-reveal-lead-contact', { body });
}