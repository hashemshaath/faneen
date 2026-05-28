/**
 * APP-SHELL-STABILIZATION-1 — Section-level loading skeleton.
 *
 * Drop-in placeholder for a single card/section that's loading.
 */
import React from 'react';
import { SHELL_CARD_BORDER, SHELL_CARD_PADDING, SHELL_CARD_RADIUS } from '@/modules/workspace/shell/shellTokens';
import { useWorkspacePreferences } from '@/hooks/useWorkspacePreferences';

export interface WorkspaceSectionSkeletonProps {
  lines?: number;
  withHeader?: boolean;
  className?: string;
}

export const WorkspaceSectionSkeleton: React.FC<WorkspaceSectionSkeletonProps> = ({
  lines = 3,
  withHeader = true,
  className,
}) => {
  const { effective_reduced_motion } = useWorkspacePreferences();
  const pulse = effective_reduced_motion ? '' : 'animate-pulse';
  return (
    <div
      data-testid="workspace-section-skeleton"
      role="status"
      aria-busy="true"
      className={`${SHELL_CARD_BORDER} ${SHELL_CARD_RADIUS} ${SHELL_CARD_PADDING} bg-card ${className ?? ''}`}
    >
      <span className="sr-only">Loading…</span>
      {withHeader && <div className={`h-4 w-1/4 rounded bg-muted/60 mb-3 ${pulse}`} />}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={`h-3 rounded bg-muted/50 ${pulse}`} style={{ width: `${90 - i * 15}%` }} />
        ))}
      </div>
    </div>
  );
};

export default WorkspaceSectionSkeleton;