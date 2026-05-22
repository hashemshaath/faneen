import { supabase } from '@/integrations/supabase/client';

export interface CreateNotificationPayload {
  user_id: string;
  title_ar: string;
  title_en: string;
  body_ar?: string;
  body_en?: string;
  notification_type: string;
  reference_type?: string;
  reference_id?: string;
  action_url?: string;
}

/**
 * Shared wrapper around direct `notifications` table inserts.
 *
 * Behavior contract (must match the legacy callsites exactly):
 * - Calls `supabase.from('notifications').insert(payload)` verbatim.
 * - Does NOT call `.select()` or `.single()`.
 * - Returns the raw insert result (`{ data, error, ... }`) unchanged.
 * - Does NOT throw on a returned `{ error }` — callers decide whether to
 *   throw, warn, or ignore (mirrors the three existing behavior groups:
 *   awaited-blocking, awaited-fail-soft, fire-and-forget).
 * - Bubbles thrown errors exactly as the underlying Supabase client does.
 * - Performs no payload validation, transformation, RPC, storage, or
 *   edge-function access.
 */
type NotificationsInsertResult = ReturnType<
  ReturnType<typeof supabase.from<'notifications'>>['insert']
>;

export async function createNotification(
  payload: CreateNotificationPayload,
): Promise<Awaited<NotificationsInsertResult>> {
  return supabase.from('notifications').insert(payload);
}

/**
 * Fire-and-forget helper for the two legacy callsites that currently use
 * `void supabase.from('notifications').insert(...)` with no awaiting and
 * no error handling.
 *
 * Behavior contract:
 * - Synchronously returns `void` (does NOT return a Promise to the caller).
 * - Internally delegates to `createNotification(payload)`.
 * - Swallows async errors by attaching a `.then(...).catch(...)` handler.
 * - Logs returned `{ error }` and thrown errors via `console.warn(tag, err)`.
 *
 * Note on the warn log: the legacy `void` callsites have no observable
 * error reporting today. Adding a single `console.warn` is an intentional,
 * minimal observability improvement that preserves all user-visible
 * behavior (no toast, no throw, no blocking). It is consistent with the
 * awaited fail-soft group's existing `console.warn` pattern.
 */
export function createNotificationFireAndForget(
  payload: CreateNotificationPayload,
  tag: string,
): void {
  createNotification(payload)
    .then((res) => {
      const err = (res as { error?: unknown } | null | undefined)?.error;
      if (err) {
        // eslint-disable-next-line no-console
        console.warn(tag, err);
      }
    })
    .catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.warn(tag, err);
    });
}