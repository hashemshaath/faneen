/**
 * Magic-link token_hash exchange wrapper (ID-4).
 *
 * Thin wrapper over `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })`
 * for the TemporaryCodeForm flow. Preserves session-creation behavior — the
 * Supabase client persists the new session, and downstream code (e.g.
 * `useRoleRedirect`) reacts to it.
 */
import { supabase } from '@/integrations/supabase/client';

export interface VerifyTemporaryCodeOtpParams {
  token_hash: string;
  type?: 'magiclink';
}

export function verifyTemporaryCodeOtp(params: VerifyTemporaryCodeOtpParams) {
  return supabase.auth.verifyOtp({
    token_hash: params.token_hash,
    type: params.type ?? 'magiclink',
  });
}