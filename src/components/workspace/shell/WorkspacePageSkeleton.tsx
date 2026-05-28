/**
 * APP-SHELL-STABILIZATION-1 — Standardized page-level loading skeleton.
 *
 * Use as the Suspense fallback / React Query loading state for any
 * workspace page so the shell rhythm stays consistent across routes.
 */
import React from 'react';
import { SHELL_PAGE_PADDING, SHELL_SECTION_STACK } from '@/modules/workspace/shell/shellTokens';
import { useWorkspacePreferences } from '@/hooks/useWorkspacePreferences';

export interface WorkspacePageSkeletonProps {
  /** How many placeholder cards to render. */
  rows?: number;
  /** Show a heading bar at the top. */
  showHeader?: boolean;
  className?: string;
}

export const WorkspacePageSkeleton: React.FC<WorkspacePageSkeletonProps> = ({
  rows = 4,
  showHeader = true,
  className,
}) => {
  const { effective_reduced_motion } = useWorkspacePreferences();
  const pulse = effective_reduced_motion ? '' : 'animate-pulse';
  return (
    <div
      data-testid="workspace-page-skeleton"
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={`${SHELL_PAGE_PADDING} ${SHELL_SECTION_STACK} ${className ?? ''}`}
    >
      <span className="sr-only">Loading…</span>
      {showHeader && (
        <div className={`h-6 w-1/3 rounded-md bg-muted/60 ${pulse}`} />
      )}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`h-20 rounded-xl border border-border/30 bg-card ${pulse}`} />
      ))}
    </div>
  );
};

export default WorkspacePageSkeleton;