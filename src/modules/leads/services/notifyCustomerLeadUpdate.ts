import { supabase } from '@/integrations/supabase/client';

export interface NotifyCustomerLeadUpdatePayload {
  lead_id: string;
  status: string;
  [key: string]: unknown;
}

/**
 * E1/E2: Wraps the notify-customer-lead-update edge function. Callers wrap
 * this in try/catch to preserve fire-and-forget / fail-soft semantics; this
 * service itself bubbles errors exactly as supabase.functions.invoke does.
 */
export async function notifyCustomerLeadUpdate(
  payload: NotifyCustomerLeadUpdatePayload,
): Promise<ReturnType<typeof supabase.functions.invoke>> {
  return supabase.functions.invoke('notify-customer-lead-update', {
    body: payload,
  });
}