/**
 * APP-SHELL-REARCHITECTURE-1 — Sticky workspace context bar.
 *
 * Thin strip that surfaces contextual quick actions/refs (recent entities,
 * recent flows). It is intentionally label-less — the chips themselves are
 * self-describing. The bar auto-hides when its children render no DOM
 * (e.g. a fresh user with no recent items), so it never appears as an
 * empty "Workspace Context" placeholder.
 */
import React from 'react';

export interface WorkspaceContextBarProps {
  children?: React.ReactNode;
  className?: string;
}

export const WorkspaceContextBar: React.FC<WorkspaceContextBarProps> = ({ children, className }) => {
  if (!children) return null;

  // Tailwind `:has()` query auto-hides the bar when the inner body has no
  // rendered child elements (every Recent* component returns null when empty).
  return (
    <div
      data-testid="workspace-context-bar"
      className={`sticky top-14 z-[5] border-b border-border/20 bg-background/85 backdrop-blur-sm [&:not(:has([data-ctxbar-body]>*))]:hidden ${className ?? ''}`}
    >
      <div className="flex items-center gap-2 px-3 sm:px-6 py-1.5">
        <div
          id="workspace-context-bar-body"
          data-ctxbar-body
          className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto no-scrollbar"
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default WorkspaceContextBar;