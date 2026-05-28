/**
 * ORG-RBAC-STRUCTURE-1 — Phase C
 *
 * Centralized, **UI-only** map of workspace (provider/user) dashboard routes →
 * required workspace permission(s), entity/location scoping, sidebar visibility,
 * and admin/owner overrides.
 *
 * Authoritative authorization remains RLS + `has_entity_membership` /
 * `has_permission` on the server. This module exists to:
 *
 *  - drive sidebar visibility from a single source of truth
 *  - power `<PermissionHint>` / `useCan` affordances consistently
 *  - make role-vs-route gaps auditable in tests
 *
 * Rules baked into {@link canViewWorkspaceRoute}:
 *   1. Admin / super-admin → always allowed (admin sidebar lives elsewhere).
 *   2. Owner role → always allowed inside its own entity.
 *   3. Explicit per-membership permission (permissions_override) wins.
 *   4. Falls back to the static role/permission catalog.
 *   5. Routes not present in the map are *not* gated (safe additive default).
 *
 * This file is the canonical map. Do NOT inline ad-hoc role checks in
 * `DashboardSidebar`; extend this map instead.
 */
import {
  hasWorkspacePermission,
  type WorkspaceLike,
  type WorkspacePermission,
} from './catalog';

export type WorkspaceScope = 'entity' | 'location' | 'personal' | 'platform';

export interface WorkspaceRouteDescriptor {
  /** Required workspace permission(s). Empty array = no permission gate. */
  permissions: WorkspacePermission[];
  /** Scope of the route. `personal` and `platform` are never permission-gated here. */
  scope: WorkspaceScope;
  /** Whether the route should appear in the workspace sidebar by default. */
  sidebar: boolean;
  /** Whether platform admins always see this entry (independent of workspace role). */
  adminOverride: boolean;
  /** Whether owner role short-circuits the permission gate. */
  ownerOverride: boolean;
  /** Read-only vs manage-level — informational, used by tests/audits. */
  level: 'view' | 'manage';
}

/**
 * Canonical workspace route → permission map.
 *
 * Keys are the exact `path` strings registered in `src/App.tsx` (or the
 * canonical landing URL of an admin-only route family). When a route is
 * absent from this map the sidebar falls through to its legacy behavior
 * (visible to any role) — this keeps the migration additive.
 */
export const WORKSPACE_ROUTE_PERMISSIONS = {
  // Overview — visible to anyone with entity access
  '/dashboard':                              { permissions: [],                                         scope: 'personal', sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/analytics':                    { permissions: ['entity.view'],                            scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/work-orders/overview':         { permissions: ['bookings.view'],                          scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/operations/feed':              { permissions: ['bookings.view'],                          scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },

  // Business profile
  '/dashboard/business-edit':                { permissions: ['entity.manage'],                          scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'manage' },
  '/dashboard/services':                     { permissions: ['services.view'],                          scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/portfolio':                    { permissions: ['entity.view'],                            scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/projects':                     { permissions: ['entity.view'],                            scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/promotions':                   { permissions: ['services.manage'],                        scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'manage' },
  '/dashboard/provider/service-areas':       { permissions: ['locations.view'],                         scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/private-sectors':              { permissions: ['entity.view'],                            scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/reviews':                      { permissions: ['entity.view'],                            scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/badge':                        { permissions: ['entity.manage'],                          scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'manage' },

  // Sales & requests
  '/dashboard/leads':                        { permissions: ['leads.view'],                             scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/provider/leads':               { permissions: ['quotes.view'],                            scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/bookings':                     { permissions: ['bookings.view'],                          scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/clients':                      { permissions: ['leads.view'],                             scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },

  // Operations
  '/dashboard/work-orders':                  { permissions: ['bookings.view'],                          scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/contracts':                    { permissions: ['contracts.view'],                         scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/contract-analytics':           { permissions: ['contracts.view'],                         scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/warranties':                   { permissions: ['contracts.view'],                         scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },

  // Membership & billing — gated to owner / finance / explicit grant.
  // Personal /membership stays personal-scope; provider membership is entity-scope.
  '/membership':                             { permissions: [],                                         scope: 'personal', sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/provider/membership':          { permissions: ['memberships.view', 'payments.view'],      scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/installments':                 { permissions: ['payments.view'],                          scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },

  // Communication — personal
  '/dashboard/messages':                     { permissions: [],                                         scope: 'personal', sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/notifications':                { permissions: [],                                         scope: 'personal', sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },

  // Settings
  '/dashboard/profile':                      { permissions: [],                                         scope: 'personal', sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/communication-preferences':    { permissions: [],                                         scope: 'personal', sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/settings':                     { permissions: ['settings.view'],                          scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/settings/staff':               { permissions: ['staff.view'],                             scope: 'entity',   sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/no-access':                    { permissions: [],                                         scope: 'personal', sidebar: false, adminOverride: true,  ownerOverride: true,  level: 'view'   },

  // User-only routes (no permission gate — visible to any authed user)
  '/dashboard/my-requests':                  { permissions: [],                                         scope: 'personal', sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },
  '/dashboard/bookmarks':                    { permissions: [],                                         scope: 'personal', sidebar: true,  adminOverride: true,  ownerOverride: true,  level: 'view'   },

  // Admin-surfaced dashboard routes (linked from admin sidebar; not gated for workspace users)
  '/dashboard/blog':                         { permissions: [],                                         scope: 'platform', sidebar: false, adminOverride: true,  ownerOverride: true,  level: 'manage' },
  '/dashboard/profile-systems':              { permissions: [],                                         scope: 'platform', sidebar: false, adminOverride: true,  ownerOverride: true,  level: 'view'   },
} as const satisfies Record<string, WorkspaceRouteDescriptor>;

export type WorkspaceRouteKey = keyof typeof WORKSPACE_ROUTE_PERMISSIONS;

export interface CanViewWorkspaceRouteContext {
  /** Active workspace membership (role + per-membership permissions). */
  workspace: WorkspaceLike | null | undefined;
  /** True when the viewer holds platform admin or super-admin role. */
  isAdmin?: boolean;
}

/**
 * UI-only "should this route be visible / actionable for this user?" check.
 *
 * NEVER use this as an authorization boundary. The server (RLS + RPCs)
 * is the only authoritative gate. This function exists so the sidebar
 * and inline affordances stay consistent with the catalog.
 */
export function canViewWorkspaceRoute(
  route: string,
  ctx: CanViewWorkspaceRouteContext,
): boolean {
  const descriptor = (WORKSPACE_ROUTE_PERMISSIONS as Record<string, WorkspaceRouteDescriptor>)[route];
  // Unmapped → fall back to legacy behavior (visible). Migration is additive.
  if (!descriptor) return true;

  // Admin / super-admin override (only when the route opts in, which all
  // workspace routes currently do — admin-only routes live in a separate map).
  if (descriptor.adminOverride && ctx.isAdmin) return true;

  // Personal / platform routes are never permission-gated here.
  if (descriptor.scope === 'personal' || descriptor.scope === 'platform') return true;
  if (descriptor.permissions.length === 0) return true;

  // Owner short-circuit
  if (descriptor.ownerOverride && ctx.workspace?.active_role === 'owner') return true;

  // Any of the required permissions satisfies (broadest-readable wins).
  return descriptor.permissions.some((p) => hasWorkspacePermission(ctx.workspace ?? null, p));
}

/**
 * Convenience: returns the descriptor for a route, or `null` if unmapped.
 * Tests use this to assert sidebar entries are accounted for.
 */
export function getWorkspaceRouteDescriptor(route: string): WorkspaceRouteDescriptor | null {
  return (WORKSPACE_ROUTE_PERMISSIONS as Record<string, WorkspaceRouteDescriptor>)[route] ?? null;
}

/** All route keys present in the canonical map. */
export function listWorkspaceRouteKeys(): string[] {
  return Object.keys(WORKSPACE_ROUTE_PERMISSIONS);
}