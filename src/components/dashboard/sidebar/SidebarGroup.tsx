/**
 * APP-SHELL-REARCHITECTURE-1 — Collapsible sidebar group with localStorage persistence.
 *
 * Distinct from shadcn's primitive `SidebarGroup`. Persists per-group
 * collapse state under `qitaat_shell_sidebar_group_{key}`.
 */
import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { SidebarGroup as PrimitiveGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu } from '@/components/ui/sidebar';

export interface CollapsibleSidebarGroupProps {
  groupKey: string;
  label: string;
  defaultOpen?: boolean;
  hidden?: boolean;
  children: React.ReactNode;
}

const storageKey = (key: string) => `qitaat_shell_sidebar_group_${key}`;

export const CollapsibleSidebarGroup: React.FC<CollapsibleSidebarGroupProps> = ({
  groupKey, label, defaultOpen = true, hidden, children,
}) => {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const v = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey(groupKey)) : null;
      if (v === null) return defaultOpen;
      return v === '1';
    } catch { return defaultOpen; }
  });

  useEffect(() => {
    try { window.localStorage.setItem(storageKey(groupKey), open ? '1' : '0'); } catch { /* noop */ }
  }, [groupKey, open]);

  if (hidden) return null;
  const childCount = React.Children.toArray(children).filter(Boolean).length;
  if (childCount === 0) return null;

  return (
    <PrimitiveGroup data-group-key={groupKey}>
      <SidebarGroupLabel asChild>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-1 hover:text-foreground transition-colors"
          aria-expanded={open}
        >
          <span>{label}</span>
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      </SidebarGroupLabel>
      {open && (
        <SidebarGroupContent>
          <SidebarMenu>{children}</SidebarMenu>
        </SidebarGroupContent>
      )}
    </PrimitiveGroup>
  );
};

export default CollapsibleSidebarGroup;