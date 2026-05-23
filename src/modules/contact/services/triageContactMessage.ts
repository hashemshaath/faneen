import { supabase } from '@/integrations/supabase/client';

/**
 * EF-4: Thin wrapper around the `triage-contact-message` edge function.
 * Returns the raw `{ data, error }` from `supabase.functions.invoke`.
 */
export async function triageContactMessage(
  payload: { message_id: string } & Record<string, unknown>,
): Promise<ReturnType<typeof supabase.functions.invoke>> {
  return supabase.functions.invoke('triage-contact-message', { body: payload });
}