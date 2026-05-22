import { supabase } from '@/integrations/supabase/client';

export interface SendTransactionalEmailPayload {
  templateName: string;
  recipientEmail: string;
  idempotencyKey: string;
  templateData?: Record<string, unknown>;
}

/**
 * Shared wrapper around the `send-transactional-email` edge function.
 *
 * Behavior contract:
 * - Invokes `send-transactional-email` with `{ body: payload }` verbatim.
 * - Returns the raw `{ data, error }` result from `supabase.functions.invoke`.
 * - Bubbles thrown errors exactly as the underlying client does.
 * - Does not transform, validate, or inspect the payload.
 * - Performs no table/RPC/storage access.
 */
export async function sendTransactionalEmail(
  payload: SendTransactionalEmailPayload,
): Promise<ReturnType<typeof supabase.functions.invoke>> {
  return supabase.functions.invoke('send-transactional-email', {
    body: payload,
  });
}