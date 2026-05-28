/**
 * APP-SHELL-REARCHITECTURE-1 — Sticky workspace context bar.
 *
 * Collapsible strip that surfaces contextual quick actions/refs. Permission
 * filtering is delegated to children via usePermissionMatrix-aware components.
 * Hidden entirely when no children are visible.
 */
import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

const STORAGE_KEY = 'qitaat_shell_ctxbar_open';

export interface WorkspaceContextBarProps {
  children?: React.ReactNode;
  className?: string;
}

export const WorkspaceContextBar: React.FC<WorkspaceContextBarProps> = ({ children, className }) => {
  const { isRTL } = useLanguage();
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const v = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
      return v === null ? true : v === '1';
    } catch { return true; }
  });

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, open ? '1' : '0'); } catch { /* noop */ }
  }, [open]);

  if (!children) return null;

  return (
    <div
      data-testid="workspace-context-bar"
      className={`sticky top-14 z-[5] border-b border-border/20 bg-background/85 backdrop-blur-sm ${className ?? ''}`}
    >
      <div className="flex items-center gap-2 px-3 sm:px-6 py-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground rounded-md px-1.5 py-0.5"
          aria-expanded={open}
          aria-controls="workspace-context-bar-body"
        >
          {open
            ? <ChevronUp className="w-3 h-3" />
            : <ChevronDown className="w-3 h-3" />}
          <span>{isRTL ? 'سياق العمل' : 'Workspace Context'}</span>
        </button>
        {open && <div id="workspace-context-bar-body" className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto no-scrollbar">{children}</div>}
      </div>
    </div>
  );
};

export default WorkspaceContextBar;