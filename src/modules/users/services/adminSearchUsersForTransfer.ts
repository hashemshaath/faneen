/**
 * Admin-only safe user search for the barcode transfer target picker.
 *
 * Wraps the `admin_search_users_for_transfer` RPC, which already enforces
 * admin/super_admin role checks and only returns minimal, masked fields
 * (no raw login email, no full phone, no auth metadata). The page layer
 * must never read the `profiles` table directly to power this picker.
 */
import { supabase } from '@/integrations/supabase/client';

export interface AdminTransferUserHit {
  user_id: string;
  ref_id: string | null;
  display_name: string;
  masked_email: string | null;
  phone_hint: string | null;
}

export interface AdminSearchUsersForTransferOptions {
  query: string;
  limit?: number;
}

export async function adminSearchUsersForTransfer(
  options: AdminSearchUsersForTransferOptions,
) {
  return await supabase.rpc('admin_search_users_for_transfer', {
    _query: options.query,
    _limit: options.limit ?? 10,
  });
}