import React from 'react';
import { NavLink } from '@/components/NavLink';
import { Clock } from 'lucide-react';
import { useRecentRoutes } from '@/hooks/useRecentRoutes';

/**
 * NAVIGATION-ARCHITECTURE-REBUILD-1 — Part D
 *
 * Renders the last visited routes as a small recency-ordered list. We
 * only render entries whose URL is present in the active menu's label
 * lookup, so token / one-off pages don't pollute the list even if the
 * tracker happens to capture them.
 */
export interface SidebarRecentProps {
  collapsed: boolean;
  isRTL: boolean;
  labelLookup: Map<string, { ar: string; en: string }>;
  closeMobile: () => void;
  isRouteHidden?: (path: string) => boolean;
}

export const SidebarRecent: React.FC<SidebarRecentProps> = ({
  collapsed,
  isRTL,
  labelLookup,
  closeMobile,
  isRouteHidden,
}) => {
  const recent = useRecentRoutes();
  const known = recent.filter((u) => labelLookup.has(u) && !isRouteHidden?.(u));
  if (collapsed || known.length === 0) return null;

  return (
    <div className="px-3 pt-3" data-testid="sidebar-recent">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/55 mb-1 px-1 flex items-center gap-1.5">
        <Clock className="w-3 h-3 opacity-70" />
        {isRTL ? 'الأخيرة' : 'Recent'}
      </p>
      <ul className="space-y-0.5">
        {known.map((url) => {
          const labels = labelLookup.get(url);
          if (!labels) return null;
          const label = isRTL ? labels.ar : labels.en;
          return (
            <li key={url}>
              <NavLink
                to={url}
                title={label}
                aria-label={label}
                onClick={closeMobile}
                activeClassName=""
                className="flex items-center min-w-0 truncate text-[12px] rounded-md px-2 py-1 text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <span className="truncate">{label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
};