import { supabase } from '@/integrations/supabase/client';

export type AmendmentEvent =
  | 'created'
  | 'pending_approval'
  | 'approved'
  | 'applied'
  | 'rejected'
  | 'cancelled';

/**
 * Fire-and-forget dispatch of contract amendment notifications + transactional
 * emails. Failures are swallowed and logged — the UI flow must never break if
 * the notifier hiccups (idempotency keys protect against retries).
 *
 * Privacy: client only supplies amendmentId + event. The edge function
 * resolves recipients and safe payload server-side and never echoes
 * sensitive fields back.
 */
export function dispatchAmendmentEvent(amendmentId: string, event: AmendmentEvent): void {
  void supabase.functions
    .invoke('notify-amendment-event', { body: { amendmentId, event } })
    .catch((err) => {
       
      console.warn('[amendment-notify] dispatch failed', event, err);
    });
}