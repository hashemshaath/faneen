import { supabase } from '@/integrations/supabase/client';

export interface NotifyClientInvitationPayload {
  invite_id: string | null | undefined;
  token: string | null | undefined;
  kind: 'created' | 'reminder' | string;
  [key: string]: unknown;
}

/**
 * EF-2: Thin wrapper around the `notify-client-invitation` edge function.
 *
 * Behavior contract:
 * - Invokes `notify-client-invitation` with `{ body: payload }` verbatim.
 * - Returns the raw `{ data, error }` result from `supabase.functions.invoke`.
 * - Does not transform, validate, or inspect the payload.
 * - Performs no table/RPC/storage access.
 */
export async function notifyClientInvitation(
  payload: NotifyClientInvitationPayload,
): Promise<ReturnType<typeof supabase.functions.invoke>> {
  return supabase.functions.invoke('notify-client-invitation', {
    body: payload,
  });
}