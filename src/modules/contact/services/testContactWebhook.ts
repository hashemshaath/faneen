import { supabase } from '@/integrations/supabase/client';

/**
 * EF-4: Thin wrapper around the `test-contact-webhook` edge function.
 * Preserves the existing payload shape (e.g. `{ override_url, override_secret }`).
 * Returns the raw `{ data, error }` from `supabase.functions.invoke`.
 */
export async function testContactWebhook(
  payload: Record<string, unknown>,
): Promise<ReturnType<typeof supabase.functions.invoke>> {
  return supabase.functions.invoke('test-contact-webhook', { body: payload });
}