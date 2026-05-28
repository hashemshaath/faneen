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
  /**
   * Optional override for the active workspace. When provided, the gate does
   * NOT call `useActiveWorkspace`, which keeps it usable in tests and in
   * trees that don't have a QueryClientProvider.
   */
  workspaceOverride?: WorkspaceCapabilityLike;
}

function renderGate(
  workspace: WorkspaceCapabilityLike,
  capability: string,
  mode: WorkspaceCapabilityGateMode,
  children: React.ReactNode,
  fallback: React.ReactNode,
): React.ReactElement {
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
}

/** Internal: pulls the workspace from context. Separated so the override
 *  path can skip the hook entirely (tests, no-QueryClient trees). */
const ConnectedGate: React.FC<Omit<WorkspaceCapabilityGateProps, 'workspaceOverride'>> = ({
  capability,
  children,
  mode = 'hide',
  fallback = null,
}) => {
  const ws = useActiveWorkspace();
  const workspace: WorkspaceCapabilityLike = {
    active_role: ws.active_role,
    permissions: ws.permissions,
  };
  return renderGate(workspace, capability, mode, children, fallback);
};

export const WorkspaceCapabilityGate: React.FC<WorkspaceCapabilityGateProps> = (props) => {
  if (props.workspaceOverride) {
    return renderGate(
      props.workspaceOverride,
      props.capability,
      props.mode ?? 'hide',
      props.children,
      props.fallback ?? null,
    );
  }
  return (
    <ConnectedGate
      capability={props.capability}
      mode={props.mode}
      fallback={props.fallback}
    >
      {props.children}
    </ConnectedGate>
  );
};

export default WorkspaceCapabilityGate;