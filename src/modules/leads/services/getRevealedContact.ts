import { supabase } from '@/integrations/supabase/client';

export interface GetRevealedContactPayload {
  lead_id: string;
  [key: string]: unknown;
}

/**
 * EF-2: Thin wrapper around the `get-revealed-contact` edge function.
 *
 * Behavior contract:
 * - Invokes `get-revealed-contact` with `{ body: payload }` verbatim.
 * - Returns the raw `{ data, error }` result from `supabase.functions.invoke`.
 * - Does not change credit-gating / reveal behavior or response shape.
 */
export async function getRevealedContact(
  payload: GetRevealedContactPayload,
): Promise<ReturnType<typeof supabase.functions.invoke>> {
  return supabase.functions.invoke('get-revealed-contact', {
    body: payload,
  });
}