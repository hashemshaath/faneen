/**
 * Wrapper around `public.admin_identity_duplicates_report()`.
 * Super-admin only; enforced by the RPC.
 */
import { supabase } from '@/integrations/supabase/client';

export type IdentityDuplicateKind =
  | 'email'
  | 'username'
  | 'phone'
  | 'auth_profile_email_mismatch';

export interface IdentityDuplicateRow {
  kind: IdentityDuplicateKind;
  value: string;
  occurrences: number;
  user_ids: string[];
  details: Record<string, unknown>;
}

export async function getAdminIdentityDuplicatesReport(): Promise<{
  data: IdentityDuplicateRow[] | null;
  error: unknown;
}> {
  const { data, error } = await supabase.rpc('admin_identity_duplicates_report');
  return { data: (data as IdentityDuplicateRow[] | null) ?? null, error };
}