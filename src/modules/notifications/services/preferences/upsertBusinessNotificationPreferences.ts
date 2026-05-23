import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';

/**
 * N-5 upsert wrapper for per-business notification preferences.
 * Preserves: upsert(payload, { onConflict: 'business_id' }).
 * Caller supplies the exact payload (including business_id).
 * Returns raw Supabase result untransformed.
 */
export function upsertBusinessNotificationPreferences(
  payload: TablesInsert<'business_notification_preferences'> & { business_id: string },
) {
  return supabase
    .from('business_notification_preferences')
    .upsert(payload, { onConflict: 'business_id' });
}