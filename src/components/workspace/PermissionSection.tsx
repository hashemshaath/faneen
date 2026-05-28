/**
 * ORG-RBAC-STRUCTURE-6 — Section-level visibility primitive.
 *
 * Hides an entire UI section when the active workspace lacks the
 * required permission. Uses the centralized `usePermissionMatrix`
 * resolution so deny/owner/admin/role/explicit/delegated/team layers
 * agree across the app.
 *
 * NOT an authorization boundary — RLS remains authoritative server-side.
 */
import React from 'react';
import { usePermissionMatrix } from '@/hooks/useVisibilityEngine';

export interface PermissionSectionProps {
  permission: string;
  fallback?: React.ReactNode;
  /** Optional override (mainly for tests / Storybook). */
  allowedOverride?: boolean;
  children: React.ReactNode;
}

export const PermissionSection: React.FC<PermissionSectionProps> = ({
  permission,
  fallback = null,
  allowedOverride,
  children,
}) => {
  const matrix = usePermissionMatrix();
  const allowed = typeof allowedOverride === 'boolean' ? allowedOverride : matrix.can(permission);
  return <>{allowed ? children : fallback}</>;
};

export default PermissionSection;