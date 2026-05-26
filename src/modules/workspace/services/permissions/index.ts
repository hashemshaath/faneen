/**
 * WORKSPACE-RBAC-6A — canonical wrappers for the role/permission catalog.
 *
 * UI-only convenience layer. RLS and `has_entity_membership` / RPC checks
 * remain authoritative on every data path. Do not branch on these reads
 * to make security decisions; gate server-side instead.
 */
import { supabase } from '@/integrations/supabase/client';

export interface PermissionCatalogRow {
  key: string;
  group_key: string;
  label_ar: string;
  label_en: string;
}

export interface RoleCatalogRow {
  key: string;
  scope: 'global' | 'entity' | 'location';
  label_ar: string;
  label_en: string;
  description: string | null;
}

export interface RolePermissionRow {
  role_key: string;
  permission_key: string;
}

export async function listRolesCatalog() {
  return await supabase
    .from('roles_catalog')
    .select('key, scope, label_ar, label_en, description')
    .order('key', { ascending: true });
}

export async function listPermissionsCatalog() {
  return await supabase
    .from('permissions_catalog')
    .select('key, group_key, label_ar, label_en')
    .order('group_key', { ascending: true })
    .order('key', { ascending: true });
}

export async function listRolePermissions() {
  return await supabase
    .from('role_permissions')
    .select('role_key, permission_key');
}

export async function getRolePermissions({ role }: { role: string }) {
  return await supabase
    .from('role_permissions')
    .select('permission_key')
    .eq('role_key', role);
}