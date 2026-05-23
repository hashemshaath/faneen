import { supabase } from '@/integrations/supabase/client';

/**
 * N-5 read wrapper for per-business notification preferences.
 * Preserves: select('*').eq('business_id', businessId).maybeSingle().
 * Returns raw { data, error } untransformed.
 */
export function getBusinessNotificationPreferences(businessId: string) {
  return supabase
    .from('business_notification_preferences')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle();
}