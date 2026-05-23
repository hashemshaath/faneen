import { supabase } from '@/integrations/supabase/client';

/**
 * EF-4: Thin wrapper around the `handle-email-unsubscribe` edge function.
 *
 * Behavior contract:
 * - Invokes the function with `{ body: payload }` (typically `{ token }`).
 * - Returns the raw `{ data, error }` from `supabase.functions.invoke`.
 * - Does not throw unless `supabase.functions.invoke` throws — public
 *   unsubscribe page semantics (success/already/error) are preserved at
 *   the call site.
 */
export async function handleEmailUnsubscribe(
  payload: { token: string } & Record<string, unknown>,
): Promise<ReturnType<typeof supabase.functions.invoke>> {
  return supabase.functions.invoke('handle-email-unsubscribe', { body: payload });
}