import { supabase } from '@/integrations/supabase/client';

/**
 * N-5 upsert wrapper for per-user notification preferences.
 * Preserves: upsert(payload, { onConflict: 'user_id' }).
 * Caller supplies the exact payload (including user_id and forced safety fields).
 * Returns raw Supabase result untransformed.
 */
export function upsertUserNotificationPreferences(
  payload: Record<string, unknown> & { user_id: string },
) {
  return supabase
    .from('notification_preferences')
    .upsert(payload, { onConflict: 'user_id' });
}