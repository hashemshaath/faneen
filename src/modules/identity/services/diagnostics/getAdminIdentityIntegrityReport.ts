/**
 * Wrapper around the admin-only `public.admin_identity_integrity_report`
 * RPC. The RPC itself enforces admin authorization via has_role().
 * Returns masked emails and mismatch flags — no raw tokens/secrets.
 */
import { supabase } from '@/integrations/supabase/client';

export interface IdentityIntegrityRow {
  user_id: string;
  masked_email: string;
  mismatch_type:
    | 'ok'
    | 'email_mismatch'
    | 'profile_missing_email'
    | 'no_email';
  has_profile: boolean;
  has_role: boolean;
  has_business: boolean;
  synthetic_or_test: boolean;
  recommended_action: string;
}

export async function getAdminIdentityIntegrityReport(): Promise<{
  data: IdentityIntegrityRow[] | null;
  error: unknown;
}> {
  const { data, error } = await supabase.rpc('admin_identity_integrity_report');
  return { data: (data as IdentityIntegrityRow[] | null) ?? null, error };
}