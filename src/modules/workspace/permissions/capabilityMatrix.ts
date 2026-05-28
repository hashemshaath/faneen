/**
 * ORG-RBAC-STRUCTURE-2 — Phase B
 *
 * Capability matrix: fine-grained, UI-only governance keys layered on top of
 * the existing role/permission catalog. Purely additive — no DB change, no
 * RLS change, no enforcement. Authoritative authorization remains RLS +
 * `has_entity_membership` / `has_permission` server-side.
 *
 * Why a separate "capability" layer?
 *  - The existing `WORKSPACE_PERMISSIONS` catalog is mirrored from the DB
 *    seed and is intentionally stable. Capabilities are richer UX-level
 *    affordances (e.g. `contracts.approve`, `work_orders.close`) that we
 *    want to drive UI gates from *before* they exist server-side.
 *  - Capabilities support explicit deny (`workspace.denies`) — denies always
 *    win, even over an owner short-circuit. This lets admins suspend a
 *    single capability for an otherwise-privileged user without touching
 *    their role.
 *
 * Safe fallbacks:
 *  - Unknown capability key → `false` (never silently true).
 *  - Missing workspace → `false`.
 *  - No role + no explicit grant → `false`.
 */
import { hasWorkspacePermission, type WorkspaceLike } from './catalog';

export const WORKSPACE_CAPABILITIES = [
  // Contracts
  'contracts.view',
  'contracts.manage',
  'contracts.approve',
  // Work orders
  'work_orders.view',
  'work_orders.assign',
  'work_orders.close',
  // Bookings
  'bookings.view',
  'bookings.manage',
  // Staff
  'staff.view',
  'staff.invite',
  'staff.suspend',
  // Billing
  'billing.view',
  'billing.manage',
  // Reports
  'reports.view',
  'reports.export',
  // Admin notes
  'admin.notes.view',
  'admin.notes.manage',
] as const;

export type WorkspaceCapability = (typeof WORKSPACE_CAPABILITIES)[number];

export const CAPABILITY_GROUPS: Record<string, WorkspaceCapability[]> = {
  contracts: ['contracts.view', 'contracts.manage', 'contracts.approve'],
  work_orders: ['work_orders.view', 'work_orders.assign', 'work_orders.close'],
  bookings: ['bookings.view', 'bookings.manage'],
  staff: ['staff.view', 'staff.invite', 'staff.suspend'],
  billing: ['billing.view', 'billing.manage'],
  reports: ['reports.view', 'reports.export'],
  admin_notes: ['admin.notes.view', 'admin.notes.manage'],
};

/**
 * Default capabilities per workspace role. Owner and entity_admin get every
 * capability. Other roles get conservative read-only defaults — managers can
 * be widened later via explicit per-membership grants.
 */
export const CAPABILITY_ROLE_DEFAULTS: Record<string, WorkspaceCapability[]> = {
  owner: [...WORKSPACE_CAPABILITIES],
  entity_admin: [...WORKSPACE_CAPABILITIES],
  business_manager: [
    'contracts.view', 'contracts.manage',
    'work_orders.view', 'work_orders.assign', 'work_orders.close',
    'bookings.view', 'bookings.manage',
    'staff.view',
    'billing.view',
    'reports.view', 'reports.export',
    'admin.notes.view',
  ],
  site_manager: [
    'contracts.view',
    'work_orders.view', 'work_orders.assign',
    'bookings.view', 'bookings.manage',
    'staff.view',
    'reports.view',
  ],
  operations_manager: [
    'contracts.view',
    'work_orders.view', 'work_orders.assign', 'work_orders.close',
    'bookings.view', 'bookings.manage',
    'reports.view',
  ],
  contracts_manager: [
    'contracts.view', 'contracts.manage', 'contracts.approve',
    'work_orders.view',
  ],
  finance: [
    'contracts.view',
    'billing.view', 'billing.manage',
    'reports.view', 'reports.export',
  ],
  sales: [
    'contracts.view',
    'bookings.view',
    'reports.view',
  ],
  staff: [
    'contracts.view',
    'work_orders.view',
    'bookings.view',
  ],
  viewer: [
    'contracts.view',
    'work_orders.view',
    'bookings.view',
    'reports.view',
  ],
};

/**
 * Extends {@link WorkspaceLike} with an optional `denies` list. Denies are
 * additive and never required by callers — pass through whatever subset of
 * fields you already have.
 */
export interface WorkspaceCapabilityLike extends WorkspaceLike {
  denies?: string[] | null;
}

export function isKnownCapability(key: string): key is WorkspaceCapability {
  return (WORKSPACE_CAPABILITIES as readonly string[]).includes(key);
}

/**
 * UI-only capability check.
 *
 * Precedence (highest → lowest):
 *  1. Explicit deny → false
 *  2. Unknown capability → false (safe fallback)
 *  3. Owner role → true
 *  4. Explicit per-membership grant (`workspace.permissions`) → true
 *  5. Role default from {@link CAPABILITY_ROLE_DEFAULTS} → true
 *  6. Fallback to the legacy permission catalog via {@link hasWorkspacePermission}
 *     so capabilities that overlap with existing permission keys still resolve.
 *  7. Otherwise → false
 */
export function hasCapability(
  workspace: WorkspaceCapabilityLike | null | undefined,
  capability: string,
): boolean {
  if (!workspace || !capability) return false;
  if (workspace.denies?.includes(capability)) return false;
  if (!isKnownCapability(capability)) return false;
  if (workspace.active_role === 'owner') return true;
  if (workspace.permissions?.includes(capability)) return true;
  const defaults = CAPABILITY_ROLE_DEFAULTS[workspace.active_role ?? ''] ?? [];
  if ((defaults as readonly string[]).includes(capability)) return true;
  // Final fallback: legacy permission catalog (covers contracts.view / .manage,
  // bookings.view / .manage, staff.view which already exist there).
  return hasWorkspacePermission(workspace, capability);
}

/** Convenience helper for batched checks (e.g. "show button if any of these"). */
export function hasAnyCapability(
  workspace: WorkspaceCapabilityLike | null | undefined,
  capabilities: readonly string[],
): boolean {
  return capabilities.some((c) => hasCapability(workspace, c));
}

/** Convenience helper for "must have all" checks. */
export function hasAllCapabilities(
  workspace: WorkspaceCapabilityLike | null | undefined,
  capabilities: readonly string[],
): boolean {
  return capabilities.every((c) => hasCapability(workspace, c));
}