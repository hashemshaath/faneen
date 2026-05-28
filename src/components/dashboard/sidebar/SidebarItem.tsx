/**
 * APP-SHELL-REARCHITECTURE-1 — Sidebar item primitive.
 *
 * Permission-aware NavLink + optional badge slot. Pure presentation;
 * caller supplies the badge count (no fetch inside the primitive).
 */
import React from 'react';
import { NavLink } from '@/components/NavLink';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

export interface SidebarItemProps {
  label: string;
  to: string;
  icon?: React.ElementType;
  badge?: React.ReactNode;
  end?: boolean;
  visible?: boolean;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ label, to, icon: Icon, badge, end, visible = true }) => {
  if (!visible) return null;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink to={to} end={end} className="flex items-center gap-2 min-h-[44px]">
          {Icon && <Icon className="w-4 h-4 shrink-0" />}
          <span className="truncate flex-1">{label}</span>
          {badge && <span className="ms-auto text-[10px]">{badge}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

export default SidebarItem;