/**
 * Admin create user edge wrapper (EF-6).
 * Thin wrapper around the `admin-create-user` edge function. Returns the
 * raw { data, error } from supabase.functions.invoke unchanged.
 */
import { supabase } from '@/integrations/supabase/client';

export type AdminCreateUserAccountType = 'individual' | 'business' | 'company';
export type AdminCreateUserRole = 'super_admin' | 'admin' | 'moderator' | 'user' | 'none';

export interface AdminCreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  account_type?: AdminCreateUserAccountType;
  membership_tier?: string;
  role?: AdminCreateUserRole;
  auto_confirm?: boolean;
}

export function adminCreateUser(payload: AdminCreateUserPayload) {
  return supabase.functions.invoke('admin-create-user', { body: payload });
}