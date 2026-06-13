/**
 * Phase 6A — shared presentational prop shapes for the AdminUsers
 * extraction. Mirrors the small subset of `profiles` / `user_roles`
 * fields the new UI primitives read. Kept narrow so future server
 * shape changes only touch the page-level adapters.
 */

export type AdminUserAccountType = 'individual' | 'business' | 'company' | string;

export type AdminUserRoleName = 'super_admin' | 'admin' | 'moderator' | 'user';

export interface AdminUserStats {
  total: number;
  active: number;
  suspended: number;
  admins: number;
  providers: number;
  customers: number;
  incomplete: number;
  recent7d: number;
}

export interface AdminUserRow {
  id: string;
  user_id: string;
  ref_id: string | null;
  full_name: string | null;
  full_name_ar?: string | null;
  full_name_en?: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  account_type: AdminUserAccountType | null;
  membership_tier: string | null;
  is_banned: boolean | null;
  is_onboarded: boolean | null;
  phone_verified: boolean | null;
  created_at: string;
}