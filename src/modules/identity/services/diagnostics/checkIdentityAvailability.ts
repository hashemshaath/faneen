/**
 * Wrapper around `public.admin_check_identity_availability`.
 * Pre-validates email/username/phone uniqueness before admin edits.
 */
import { supabase } from '@/integrations/supabase/client';

export interface IdentityAvailabilityResult {
  email_taken: boolean;
  auth_email_taken: boolean;
  username_taken: boolean;
  phone_taken: boolean;
  available: boolean;
}

export interface CheckIdentityAvailabilityArgs {
  email?: string | null;
  username?: string | null;
  phone?: string | null;
  excludeUserId?: string | null;
}

export async function checkIdentityAvailability(
  args: CheckIdentityAvailabilityArgs,
): Promise<{ data: IdentityAvailabilityResult | null; error: unknown }> {
  const { data, error } = await supabase.rpc('admin_check_identity_availability', {
    _email: args.email ?? null,
    _username: args.username ?? null,
    _phone: args.phone ?? null,
    _exclude_user_id: args.excludeUserId ?? null,
  });
  return { data: (data as unknown as IdentityAvailabilityResult | null) ?? null, error };
}