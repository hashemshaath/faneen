import { supabase } from '@/integrations/supabase/client';

export type ModuleCategory =
  | 'core'
  | 'business'
  | 'finance'
  | 'ai'
  | 'insights'
  | 'marketing'
  | 'communication'
  | 'workspace'
  | 'general';

export type ScopeType = 'global_default' | 'account_type' | 'entity' | 'user';

export interface SystemModule {
  id: string;
  key: string;
  category: ModuleCategory;
  label_ar: string;
  label_en: string;
  description_ar: string | null;
  description_en: string | null;
  icon: string | null;
  route: string | null;
  is_core: boolean;
  default_enabled: boolean;
  default_account_types: string[];
  sort_order: number;
  is_active: boolean;
}

export interface SystemModuleOverride {
  id: string;
  module_key: string;
  scope_type: ScopeType;
  scope_value: string | null;
  enabled: boolean;
  reason: string | null;
  set_by: string | null;
  updated_at: string;
}

export interface EffectiveVisibility {
  module_key: string;
  enabled: boolean;
  source: 'core' | 'user' | 'entity' | 'account_type' | 'global_default' | 'module_default';
}

export interface SystemModuleAuditEntry {
  id: string;
  action: 'grant' | 'revoke' | 'reset' | 'update';
  module_key: string;
  scope_type: ScopeType;
  scope_value: string | null;
  previous_enabled: boolean | null;
  new_enabled: boolean | null;
  reason: string | null;
  actor: string | null;
  created_at: string;
}

export async function listSystemModules(): Promise<SystemModule[]> {
  const { data, error } = await (supabase as any)
    .from('system_modules')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SystemModule[];
}

export async function listAllOverrides(): Promise<SystemModuleOverride[]> {
  const { data, error } = await (supabase as any)
    .from('system_module_overrides')
    .select('*');
  if (error) throw error;
  return (data ?? []) as SystemModuleOverride[];
}

export async function setModuleOverride(params: {
  moduleKey: string;
  scopeType: ScopeType;
  scopeValue: string | null;
  enabled: boolean;
  reason?: string | null;
}): Promise<void> {
  const { error } = await (supabase as any).rpc('admin_set_module_override', {
    _module_key: params.moduleKey,
    _scope_type: params.scopeType,
    _scope_value: params.scopeValue,
    _enabled: params.enabled,
    _reason: params.reason ?? null,
  });
  if (error) throw error;
}

export async function clearModuleOverride(params: {
  moduleKey: string;
  scopeType: ScopeType;
  scopeValue: string | null;
}): Promise<void> {
  const { error } = await (supabase as any).rpc('admin_clear_module_override', {
    _module_key: params.moduleKey,
    _scope_type: params.scopeType,
    _scope_value: params.scopeValue,
  });
  if (error) throw error;
}

export async function getUserVisibleModules(
  userId: string,
  entityId: string | null = null,
): Promise<EffectiveVisibility[]> {
  const { data, error } = await (supabase as any).rpc('get_user_visible_modules', {
    _user_id: userId,
    _entity_id: entityId,
  });
  if (error) throw error;
  return (data ?? []) as EffectiveVisibility[];
}

/** Owner-managed override (entity or staff user scope). */
export async function ownerSetModuleOverride(params: {
  moduleKey: string;
  scopeType: 'entity' | 'user';
  scopeValue: string;
  enabled: boolean;
  reason?: string | null;
}): Promise<void> {
  const { error } = await (supabase as any).rpc('owner_set_module_override', {
    _module_key: params.moduleKey,
    _scope_type: params.scopeType,
    _scope_value: params.scopeValue,
    _enabled: params.enabled,
    _reason: params.reason ?? null,
  });
  if (error) throw error;
}

export async function ownerClearModuleOverride(params: {
  moduleKey: string;
  scopeType: 'entity' | 'user';
  scopeValue: string;
}): Promise<void> {
  const { error } = await (supabase as any).rpc('owner_clear_module_override', {
    _module_key: params.moduleKey,
    _scope_type: params.scopeType,
    _scope_value: params.scopeValue,
  });
  if (error) throw error;
}

export async function ownerGetStaffVisibleModules(
  staffUserId: string,
  entityId: string | null = null,
): Promise<EffectiveVisibility[]> {
  const { data, error } = await (supabase as any).rpc('owner_get_staff_visible_modules', {
    _staff_user_id: staffUserId,
    _entity_id: entityId,
  });
  if (error) throw error;
  return (data ?? []) as EffectiveVisibility[];
}

export async function listAuditLog(limit = 100): Promise<SystemModuleAuditEntry[]> {
  const { data, error } = await (supabase as any)
    .from('system_module_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as SystemModuleAuditEntry[];
}

/* ------------------------------------------------------------------ */
/* MEMBERSHIP-SYSTEM-ACCESS-GOVERNANCE-1                              */
/* Super-admin-only governance helpers.                               */
/* ------------------------------------------------------------------ */

export interface MembershipPlanModuleRow {
  module_key: string;
  label_ar: string;
  label_en: string;
  category: string;
  is_core: boolean;
  enabled: boolean;
}

/**
 * Per-business super-admin override. Requires a non-empty reason and the
 * caller MUST hold the `super_admin` role (enforced server-side). Writes
 * to `system_module_audit_log` via the existing trigger.
 */
export async function superAdminSetBusinessModuleOverride(params: {
  businessId: string;
  moduleKey: string;
  enabled: boolean;
  reason: string;
}): Promise<void> {
  const reason = (params.reason ?? '').trim();
  if (!reason) throw new Error('reason required for super-admin override');
  const { error } = await (supabase as any).rpc('super_admin_set_business_module_override', {
    _business_id: params.businessId,
    _module_key: params.moduleKey,
    _enabled: params.enabled,
    _reason: reason,
  });
  if (error) throw error;
}

/**
 * Toggle a module on/off for a membership plan. Super-admin only.
 * Writes an audit row tagged `account_type` / `plan:<id>`.
 */
export async function superAdminSetMembershipPlanModule(params: {
  planId: string;
  moduleKey: string;
  enabled: boolean;
}): Promise<void> {
  const { error } = await (supabase as any).rpc('super_admin_set_membership_plan_module', {
    _plan_id: params.planId,
    _module_key: params.moduleKey,
    _enabled: params.enabled,
  });
  if (error) throw error;
}

/** Returns every active module joined with the plan's enabled flag. */
export async function listMembershipPlanModules(
  planId: string,
): Promise<MembershipPlanModuleRow[]> {
  const { data, error } = await (supabase as any).rpc('list_membership_plan_modules', {
    _plan_id: planId,
  });
  if (error) throw error;
  return (data ?? []) as MembershipPlanModuleRow[];
}