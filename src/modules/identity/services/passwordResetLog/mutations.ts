/**
 * Password reset log writes (ID-4).
 *
 * Wraps `supabase.from('password_reset_log').insert(...)` verbatim. Callers
 * that previously swallowed errors (per ForgotPasswordForm / ResetPassword)
 * continue to do so — this wrapper does NOT alter throw semantics.
 *
 * Guard: payload type forbids `password` / `otp` / `token` fields.
 */
import { supabase } from '@/integrations/supabase/client';
import type { PasswordResetLogInsert } from './types';

export function createPasswordResetLog(payload: PasswordResetLogInsert) {
  // Metadata is typed loosely on the caller side; cast to the generated
  // Json shape expected by the Supabase client without losing type-safety
  // on the rest of the payload.
  const row = {
    ...payload,
    metadata: (payload.metadata ?? {}) as Record<string, unknown>,
  };
  return supabase.from('password_reset_log').insert(row as never);
}