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
import { sanitizePasswordResetMetadata } from './sanitize';

export function createPasswordResetLog(payload: PasswordResetLogInsert) {
  // Every payload runs through the PRA-2 sanitizer so forbidden keys
  // (token/cookie/Authorization/etc.) and oversized blobs can never reach
  // the table, even if a future caller forgets to pre-sanitize.
  const row = {
    ...payload,
    metadata: sanitizePasswordResetMetadata(
      (payload.metadata ?? {}) as Record<string, unknown>,
    ),
  };
  return supabase.from('password_reset_log').insert(row as never);
}