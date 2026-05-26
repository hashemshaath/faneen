/**
 * WORKSPACE-RBAC-6A — static role/permission catalog (UI hint only).
 *
 * Mirrors the DB seed in roles_catalog / permissions_catalog /
 * role_permissions. Kept in sync so that `useCan` / `hasWorkspacePermission`
 * can resolve synchronously without an extra fetch. The DB remains the
 * source of truth — the audit test asserts that these defaults are a
 * subset of the seeded role_permissions rows.
 *
 * NOT for authorization. RLS + server RPCs are authoritative.
 */
export const WORKSPACE_ROLES = [
  'owner',
  'entity_admin',
  'business_manager',
  'site_manager',
  'operations_manager',
  'contracts_manager',
  'finance',
  'sales',
  'staff',
  'viewer',
] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const WORKSPACE_PERMISSIONS = [
  'entity.view', 'entity.manage', 'entity.verify',
  'staff.view', 'staff.manage',
  'locations.view', 'locations.manage',
  'services.view', 'services.manage',
  'leads.view', 'leads.manage',
  'quotes.view', 'quotes.create', 'quotes.respond',
  'contracts.view', 'contracts.create', 'contracts.sign', 'contracts.manage',
  'bookings.view', 'bookings.manage',
  'documents.view', 'documents.upload', 'documents.manage',
  'memberships.view', 'memberships.manage',
  'payments.view', 'payments.manage',
  'settings.view', 'settings.manage',
] as const;

export type WorkspacePermission = (typeof WORKSPACE_PERMISSIONS)[number];

const ALL: WorkspacePermission[] = [...WORKSPACE_PERMISSIONS];

export const ROLE_PERMISSION_DEFAULTS: Record<WorkspaceRole, WorkspacePermission[]> = {
  owner: ALL,
  entity_admin: ALL,
  business_manager: [
    'entity.view',
    'staff.view',
    'locations.view', 'locations.manage',
    'services.view', 'services.manage',
    'leads.view', 'leads.manage',
    'quotes.view', 'quotes.respond',
    'contracts.view', 'contracts.manage',
    'bookings.view', 'bookings.manage',
    'documents.view', 'documents.upload', 'documents.manage',
    'memberships.view',
    'payments.view',
    'settings.view',
  ],
  site_manager: [
    'entity.view',
    'locations.view',
    'leads.view', 'leads.manage',
    'quotes.view', 'quotes.respond',
    'contracts.view',
    'bookings.view', 'bookings.manage',
    'documents.view', 'documents.upload',
  ],
  operations_manager: [
    'entity.view',
    'leads.view', 'leads.manage',
    'quotes.view', 'quotes.respond',
    'contracts.view', 'contracts.manage',
    'bookings.view', 'bookings.manage',
    'documents.view', 'documents.upload',
  ],
  contracts_manager: [
    'entity.view',
    'contracts.view', 'contracts.create', 'contracts.sign', 'contracts.manage',
    'documents.view', 'documents.upload', 'documents.manage',
  ],
  finance: [
    'entity.view',
    'memberships.view', 'memberships.manage',
    'payments.view', 'payments.manage',
    'contracts.view',
    'documents.view',
  ],
  sales: [
    'entity.view',
    'leads.view', 'leads.manage',
    'quotes.view', 'quotes.respond',
    'services.view',
  ],
  staff: [
    'entity.view',
    'locations.view',
    'leads.view',
    'quotes.view',
    'contracts.view',
    'bookings.view',
    'documents.view',
  ],
  viewer: ['entity.view'],
};

export function getDefaultPermissionsForRole(role: string | null | undefined): WorkspacePermission[] {
  if (!role) return [];
  return ROLE_PERMISSION_DEFAULTS[role as WorkspaceRole] ?? [];
}

export interface WorkspaceLike {
  active_role: string | null;
  permissions: string[];
}

/**
 * UI-only permission check.
 *  - owner role short-circuits to true.
 *  - explicit per-membership `permissions` (from permissions_override) win.
 *  - else falls back to role defaults from the static catalog.
 *  - unknown permissions / no role → false.
 */
export function hasWorkspacePermission(
  workspace: WorkspaceLike | null | undefined,
  permission: string,
): boolean {
  if (!workspace || !permission) return false;
  if (workspace.active_role === 'owner') return true;
  if (workspace.permissions?.includes(permission)) return true;
  const defaults = getDefaultPermissionsForRole(workspace.active_role);
  return (defaults as readonly string[]).includes(permission);
}