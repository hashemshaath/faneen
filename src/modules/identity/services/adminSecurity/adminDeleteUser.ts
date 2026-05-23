/**
 * Admin delete user edge wrapper (ID-3).
 */
import { supabase } from '@/integrations/supabase/client';

export interface AdminDeleteUserPayload {
  target_user_id: string;
}

export function adminDeleteUser(payload: AdminDeleteUserPayload) {
  return supabase.functions.invoke('admin-delete-user', { body: payload });
}