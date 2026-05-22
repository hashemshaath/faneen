/**
 * User roles service wrappers (R1A foundation).
 *
 * SECURITY:
 *  - Authoritative role checks live in the `has_role` SQL function
 *    (security definer). These wrappers call it; they do not invent
 *    new client-side role logic.
 *  - No callsites are migrated in R1A. AuthContext and AdminUsers
 *    continue to use their existing direct queries until R1B.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { safeRpc } from './rpc';

export type AppRole = Database['public']['Enums']['app_role'];

export async function getUserRoles(userId: string): Promise<AppRole[]> {
  if (!userId) return [];
  const res = await safeRpc<Array<{ role: AppRole }>>(
    supabase.from('user_roles').select('role').eq('user_id', userId)
  );
  if (!res.ok || !res.data) return [];
  return res.data.map((r) => r.role);
}

export async function hasRole(userId: string, role: AppRole): Promise<boolean> {
  if (!userId) return false;
  const res = await safeRpc<boolean>(
    supabase.rpc('has_role', { _user_id: userId, _role: role })
  );
  return res.ok ? Boolean(res.data) : false;
}

export async function hasAdminAccess(userId: string): Promise<boolean> {
  if (!userId) return false;
  const [admin, superAdmin] = await Promise.all([
    hasRole(userId, 'admin'),
    hasRole(userId, 'super_admin'),
  ]);
  return admin || superAdmin;
}

export async function hasSuperAdminAccess(userId: string): Promise<boolean> {
  return hasRole(userId, 'super_admin');
}
