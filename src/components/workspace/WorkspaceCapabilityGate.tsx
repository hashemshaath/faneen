/**
 * ORG-RBAC-STRUCTURE-2 — Phase C
 *
 * UI-only capability gate. Wraps `hasCapability` and supports three render
 * modes:
 *
 *   - `mode="hide"` (default): render `fallback` (or null) when denied.
 *   - `mode="readOnly"`: render children PLUS an inline {@link ReadOnlyWorkspaceNotice}
 *      so the page stays visible but the user understands they cannot mutate.
 *      Callers are responsible for disabling their own form controls — the
 *      gate is purely advisory.
 *   - `mode="restricted"`: render {@link RestrictedWorkspaceCard} as a full-card
 *      empty state.
 *
 * NOT for authorization. RLS + server RPCs remain authoritative.
 */
import React from 'react';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';
import { hasCapability, type WorkspaceCapabilityLike } from '@/modules/workspace/permissions/capabilityMatrix';
import { ReadOnlyWorkspaceNotice } from './ReadOnlyWorkspaceNotice';
import { RestrictedWorkspaceCard } from './RestrictedWorkspaceCard';

export type WorkspaceCapabilityGateMode = 'hide' | 'readOnly' | 'restricted';

export interface WorkspaceCapabilityGateProps {
  capability: string;
  children: React.ReactNode;
  mode?: WorkspaceCapabilityGateMode;
  fallback?: React.ReactNode;
  /** Optional override for the active workspace (mainly for tests). */
  workspaceOverride?: WorkspaceCapabilityLike;
}

export const WorkspaceCapabilityGate: React.FC<WorkspaceCapabilityGateProps> = ({
  capability,
  children,
  mode = 'hide',
  fallback = null,
  workspaceOverride,
}) => {
  const ws = useActiveWorkspace();
  const workspace: WorkspaceCapabilityLike = workspaceOverride ?? {
    active_role: ws.active_role,
    permissions: ws.permissions,
  };
  const allowed = hasCapability(workspace, capability);

  if (allowed) return <>{children}</>;

  if (mode === 'readOnly') {
    return (
      <>
        <ReadOnlyWorkspaceNotice />
        {children}
      </>
    );
  }
  if (mode === 'restricted') {
    return <RestrictedWorkspaceCard capability={capability} />;
  }
  return <>{fallback}</>;
};

export default WorkspaceCapabilityGate;