/**
 * ORG-RBAC-STRUCTURE-6 — Visibility hooks.
 *
 * Centralized UI visibility decisions. NEVER an authorization boundary:
 * RLS + has_permission server-side remain authoritative. These hooks
 * exist so the sidebar, route guard, and section gates all agree.
 */
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';
import {
  WORKSPACE_ROUTE_PERMISSIONS,
  canViewWorkspaceRoute,
  type WorkspaceRouteDescriptor,
} from '@/modules/workspace/permissions/routePermissions';
import {
  resolveEffectivePermissions,
  hasEffectivePermission,
  type ResolvedPermissions,
} from '@/modules/workspace/permissions/resolveEffectivePermissions';

export interface VisibleRouteEntry {
  path: string;
  descriptor: WorkspaceRouteDescriptor;
}

/** All workspace routes the active user is allowed to see. */
export function useVisibleRoutes(): VisibleRouteEntry[] {
  const { isAdmin, isSuperAdmin } = useAuth();
  const ws = useActiveWorkspace();
  return useMemo(() => {
    const ctx = {
      workspace: { active_role: ws.active_role, permissions: ws.permissions },
      isAdmin: !!(isAdmin || isSuperAdmin),
    };
    return Object.entries(WORKSPACE_ROUTE_PERMISSIONS)
      .filter(([path]) => canViewWorkspaceRoute(path, ctx))
      .map(([path, descriptor]) => ({ path, descriptor }));
  }, [ws.active_role, ws.permissions, isAdmin, isSuperAdmin]);
}

/**
 * Group descriptor → visibility map. Caller passes the sidebar config
 * (an array of `{ key, urls }`); we return a Set of visible group keys.
 * Centralizes the "hide a group when no item is visible" decision.
 */
export function useVisibleSidebarGroups(
  groups: Array<{ key: string; urls: string[] }>,
): Set<string> {
  const visibleRoutes = useVisibleRoutes();
  const visibleSet = useMemo(
    () => new Set(visibleRoutes.map((r) => r.path)),
    [visibleRoutes],
  );
  return useMemo(() => {
    const out = new Set<string>();
    for (const g of groups) {
      // Routes not present in the canonical map fall through to visible
      // (matches canViewWorkspaceRoute's additive default).
      const anyVisible = g.urls.some(
        (u) => visibleSet.has(u) || !(u in WORKSPACE_ROUTE_PERMISSIONS),
      );
      if (anyVisible) out.add(g.key);
    }
    return out;
  }, [groups, visibleSet]);
}

/**
 * Effective permission matrix for the active workspace. Merges role
 * defaults, explicit per-membership grants, delegated access, team
 * memberships, and owner/admin overrides via
 * {@link resolveEffectivePermissions}.
 *
 * NOTE: delegations & teamMemberships are wired through callers (Staff
 * Center hydrates these). When not supplied, the matrix degrades to
 * role + explicit permissions only — never throws.
 */
export interface UsePermissionMatrixInput {
  delegations?: Parameters<typeof resolveEffectivePermissions>[0] extends infer T
    ? T extends { delegations?: infer D } ? D : never
    : never;
  teamMemberships?: Parameters<typeof resolveEffectivePermissions>[0] extends infer T
    ? T extends { teamMemberships?: infer M } ? M : never
    : never;
}

export interface PermissionMatrix extends ResolvedPermissions {
  can: (permission: string) => boolean;
}

export function usePermissionMatrix(input: UsePermissionMatrixInput = {}): PermissionMatrix {
  const { isAdmin, isSuperAdmin } = useAuth();
  const ws = useActiveWorkspace();
  const resolved = useMemo(
    () =>
      resolveEffectivePermissions({
        active_role: ws.active_role,
        permissions: ws.permissions,
        isAdmin: !!(isAdmin || isSuperAdmin),
        delegations: input.delegations ?? null,
        teamMemberships: input.teamMemberships ?? null,
      }),
    [ws.active_role, ws.permissions, isAdmin, isSuperAdmin, input.delegations, input.teamMemberships],
  );
  return useMemo(
    () => ({ ...resolved, can: (p: string) => hasEffectivePermission(resolved, p) }),
    [resolved],
  );
}