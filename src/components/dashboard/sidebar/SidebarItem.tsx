/**
 * APP-SHELL-REARCHITECTURE-1 — Sidebar item primitive.
 *
 * Permission-aware NavLink + optional badge slot. Pure presentation;
 * caller supplies the badge count (no fetch inside the primitive).
 */
import React from 'react';
import { NavLink } from '@/components/NavLink';
import { useLocation, matchPath } from 'react-router-dom';
import { cn } from '@/lib/utils';
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
  const { pathname } = useLocation();
  if (!visible) return null;
  const isActive = end
    ? pathname === to
    : !!matchPath({ path: to, end: false }, pathname);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={label}
        className={cn(
          'group/qit-item h-11 min-h-[44px] rounded-xl px-3 gap-2.5 text-[13px] font-medium',
          'text-foreground/75 hover:text-foreground hover:bg-muted/60',
          'transition-all duration-200',
          'data-[active=true]:bg-gradient-to-r data-[active=true]:from-primary/15 data-[active=true]:to-primary/5',
          'data-[active=true]:text-primary data-[active=true]:font-semibold',
          'data-[active=true]:shadow-sm data-[active=true]:ring-1 data-[active=true]:ring-primary/20',
        )}
      >
        <NavLink to={to} end={end} className="flex items-center gap-2.5 w-full">
          {Icon && (
            <Icon
              className={cn(
                'w-4 h-4 shrink-0 transition-transform',
                isActive ? 'text-primary' : 'text-muted-foreground group-hover/qit-item:text-foreground',
                'group-hover/qit-item:scale-110',
              )}
            />
          )}
          <span className="truncate flex-1">{label}</span>
          {badge && <span className="ms-auto text-[10px]">{badge}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

export default SidebarItem;