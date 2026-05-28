/**
 * ORG-RBAC-9F: Admin update auth-user email wrapper.
 * Thin wrapper around `supabase.functions.invoke('admin-update-user-email')`.
 * Super-admin only; mirrors result to profiles.email server-side.
 */
import { supabase } from '@/integrations/supabase/client';

export interface AdminUpdateUserEmailPayload {
  target_user_id: string;
  new_email: string;
  auto_confirm?: boolean;
}

export function adminUpdateUserEmail(payload: AdminUpdateUserEmailPayload) {
  return supabase.functions.invoke('admin-update-user-email', { body: payload });
}