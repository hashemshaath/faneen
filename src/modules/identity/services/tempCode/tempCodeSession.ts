/**
 * Temporary-code session edge wrapper (ID-4).
 *
 * Beta-only operator-issued code verification. Returns raw `{ data, error }`
 * so callers preserve their existing error mapping logic.
 */
import { supabase } from '@/integrations/supabase/client';

export interface TempCodeSessionPayload {
  identifier: string;
  code: string;
}

export interface TempCodeSessionResponse {
  ok?: boolean;
  error?: string;
  email?: string;
  token_hash?: string;
}

export function createTempCodeSession(payload: TempCodeSessionPayload) {
  return supabase.functions.invoke('temp-code-session', { body: payload });
}