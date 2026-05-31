/**
 * ORG-RBAC-STRUCTURE-6 — Route-level permission guard.
 *
 * Wraps a route element with a centralized permission check derived from
 * `WORKSPACE_ROUTE_PERMISSIONS`. Preserves all existing ProtectedRoute
 * semantics (auth, requireAdmin/requireProvider, loading state) — it is
 * always placed *inside* ProtectedRoute so auth handling stays unchanged.
 *
 * Redirects denied users to `/dashboard/no-access` with the attempted
 * path in router state. Owner / admin / super-admin overrides are
 * preserved through `canViewWorkspaceRoute`.
 *
 * NOT an authorization boundary. RLS remains authoritative.
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';
import { canViewWorkspaceRoute } from '@/modules/workspace/permissions/routePermissions';
import { useVisibleModules } from '@/hooks/useVisibleModules';

export interface PermissionRouteGuardProps {
  /** Optional explicit route key. Defaults to the current pathname. */
  route?: string;
  /** Redirect target when access is denied. */
  fallbackPath?: string;
  children: React.ReactNode;
}

export const PermissionRouteGuard: React.FC<PermissionRouteGuardProps> = ({
  route,
  fallbackPath = '/dashboard/no-access',
  children,
}) => {
  const location = useLocation();
  const { isAdmin, isSuperAdmin, loading } = useAuth();
  const ws = useActiveWorkspace();
  const { isRouteHidden, isLoading: modulesLoading } = useVisibleModules();

  if (loading || ws.isLoading || modulesLoading) {
    return <>{children}</>; // ProtectedRoute already shows the auth loader
  }

  const path = route ?? location.pathname;
  if (isRouteHidden(path)) {
    return (
      <Navigate
        to={fallbackPath}
        replace
        state={{ from: location.pathname, denied: true, reason: 'module_disabled' }}
      />
    );
  }
  const allowed = canViewWorkspaceRoute(path, {
    workspace: { active_role: ws.active_role, permissions: ws.permissions },
    isAdmin: !!(isAdmin || isSuperAdmin),
  });

  if (allowed) return <>{children}</>;
  return (
    <Navigate
      to={fallbackPath}
      replace
      state={{ from: location.pathname, denied: true }}
    />
  );
};

export default PermissionRouteGuard;