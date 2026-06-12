// Shared edge-side notification dispatcher.
// ---------------------------------------------------------------------------
// Edge functions MUST NOT write directly to the `notifications` table — this
// wrapper is the approved fan-out path. It preserves caller semantics 1:1:
//   - same payload shape (no field renaming, no defaults injected)
//   - same recipients (caller supplies the rows verbatim)
//   - same timing (single bulk insert per call, no batching/backoff added)
//   - same error surface (returns `{ error }` for caller-side logging)
// Enforced by `src/__tests__/hardening1c.edgeFunctionAudit.test.ts`.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export interface EdgeNotificationPayload {
  user_id: string;
  notification_type: string;
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
  action_url?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
}

export interface DispatchNotificationsResult {
  error: { message: string } | null;
  inserted: number;
}

/**
 * Insert one or more in-app notifications via the approved edge dispatcher.
 * No-op (and no error) when `payloads` is empty, matching prior callsite
 * behaviour that guarded the insert with `if (payloads.length > 0)`.
 */
export async function dispatchEdgeNotifications(
  supabase: SupabaseClient,
  payloads: readonly EdgeNotificationPayload[],
): Promise<DispatchNotificationsResult> {
  if (payloads.length === 0) return { error: null, inserted: 0 };
  const { error } = await supabase
    .from('notifications')
    .insert(payloads as EdgeNotificationPayload[]);
  return {
    error: error ? { message: error.message } : null,
    inserted: error ? 0 : payloads.length,
  };
}