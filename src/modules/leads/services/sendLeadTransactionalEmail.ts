import { supabase } from '@/integrations/supabase/client';

export interface SendLeadTransactionalEmailPayload {
  templateName: string;
  recipientEmail: string;
  idempotencyKey: string;
  templateData?: Record<string, unknown>;
}

/**
 * Fail-soft wrapper for the send-transactional-email edge function.
 * Swallows errors so callers can treat email as fire-and-forget.
 */
export async function sendLeadTransactionalEmail(
  payload: SendLeadTransactionalEmailPayload,
): Promise<ReturnType<typeof supabase.functions.invoke>> {
  return supabase.functions.invoke('send-transactional-email', {
    body: payload,
  });
}
