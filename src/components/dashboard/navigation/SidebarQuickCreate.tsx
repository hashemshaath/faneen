import React from 'react';
import { NavLink } from '@/components/NavLink';
import { quickCreateFor } from './menuArchitecture';

/**
 * NAVIGATION-ARCHITECTURE-REBUILD-1 — Part D
 *
 * Compact row of "create" shortcuts pinned just below the brand. Hidden
 * when the sidebar collapses to icon-only mode (the icons would otherwise
 * collide with the main menu icons and confuse the active state).
 */
export interface SidebarQuickCreateProps {
  collapsed: boolean;
  isRTL: boolean;
  audience: 'provider' | 'admin' | 'user';
  closeMobile: () => void;
}

export const SidebarQuickCreate: React.FC<SidebarQuickCreateProps> = ({
  collapsed,
  isRTL,
  audience,
  closeMobile,
}) => {
  const actions = quickCreateFor(audience);
  if (collapsed || actions.length === 0) return null;

  return (
    <div className="px-3 pt-3" data-testid="sidebar-quick-create">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/55 mb-1.5 px-1">
        {isRTL ? 'إنشاء سريع' : 'Quick create'}
      </p>
      <div className="grid grid-cols-5 gap-1">
        {actions.map((a) => {
          const Icon = a.icon;
          const label = isRTL ? a.label.ar : a.label.en;
          return (
            <NavLink
              key={a.id}
              to={a.url}
              title={label}
              aria-label={label}
              className="group flex items-center justify-center h-8 rounded-md bg-sidebar-accent/40 hover:bg-primary/15 hover:text-primary text-sidebar-foreground/70 transition-colors"
              activeClassName=""
              onClick={closeMobile}
            >
              <Icon className="h-3.5 w-3.5" />
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};