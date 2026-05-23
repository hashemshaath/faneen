import { supabase } from '@/integrations/supabase/client';

/**
 * N-5 read wrapper for per-user notification preferences.
 * Preserves: select('*').eq('user_id', userId).maybeSingle().
 * Returns raw { data, error } untransformed.
 */
export function getUserNotificationPreferences(userId: string) {
  return supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
}