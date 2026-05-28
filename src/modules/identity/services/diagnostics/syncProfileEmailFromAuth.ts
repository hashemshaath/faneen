/**
 * Wrapper around `public.admin_sync_profile_email_from_auth(uuid)`.
 */
import { supabase } from '@/integrations/supabase/client';

export interface SyncProfileEmailResult {
  success: boolean;
  reason?: string;
  old?: string | null;
  new?: string | null;
}

export async function syncProfileEmailFromAuth(
  targetUserId: string,
): Promise<{ data: SyncProfileEmailResult | null; error: unknown }> {
  const { data, error } = await supabase.rpc('admin_sync_profile_email_from_auth', {
    _target_user_id: targetUserId,
  });
  return { data: (data as unknown as SyncProfileEmailResult | null) ?? null, error };
}