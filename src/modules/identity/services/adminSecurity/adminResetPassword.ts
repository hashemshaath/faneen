/**
 * Admin reset password edge wrapper (ID-3).
 *
 * Thin wrapper around `supabase.functions.invoke('admin-reset-password')`.
 * Returns the raw `{ data, error }` invoke result so callers preserve their
 * existing `if (res.error) throw res.error; if (res.data?.error) throw …`
 * pattern verbatim.
 */
import { supabase } from '@/integrations/supabase/client';

export type AdminResetPasswordAction = 'change_password' | 'send_reset_link';

export interface AdminResetPasswordPayload {
  target_user_id: string;
  action: AdminResetPasswordAction;
  new_password?: string;
}

export function adminResetPassword(payload: AdminResetPasswordPayload) {
  return supabase.functions.invoke('admin-reset-password', { body: payload });
}