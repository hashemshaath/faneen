import React from 'react';
import { NavLink } from '@/components/NavLink';
import { Pin, X } from 'lucide-react';
import { useAdminFavorites } from '@/hooks/useAdminFavorites';
import { ADMIN_NAV_ITEMS } from '@/modules/admin-shell';

/**
 * ADMIN-REDESIGN PHASE 3F — Favorites Follow-Up
 *
 * Renders the admin's pinned routes as a compact section above the main
 * sidebar groups. Reads from {@link useAdminFavorites} (localStorage
 * key `qitaat_admin_favorites_v1`). Hidden / unauthorized routes are
 * filtered by the hook itself and never appear here.
 */
export interface AdminSidebarFavoritesProps {
  collapsed: boolean;
  isRTL: boolean;
  isSuperAdmin: boolean;
  closeMobile: () => void;
}

export const AdminSidebarFavorites: React.FC<AdminSidebarFavoritesProps> = ({
  collapsed,
  isRTL,
  isSuperAdmin,
  closeMobile,
}) => {
  const { favorites, remove } = useAdminFavorites({ isSuperAdmin });

  const labelLookup = React.useMemo(() => {
    const m = new Map<string, { ar: string; en: string }>();
    for (const it of ADMIN_NAV_ITEMS) m.set(it.route, { ar: it.labelAr, en: it.labelEn });
    return m;
  }, []);

  if (collapsed || favorites.length === 0) return null;

  return (
    <div className="px-3 pt-3" data-testid="admin-sidebar-favorites">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/55 mb-1 px-1 flex items-center gap-1.5">
        <Pin className="w-3 h-3 opacity-70" />
        {isRTL ? 'المثبّتة' : 'Pinned'}
      </p>
      <ul className="space-y-0.5">
        {favorites.map((route) => {
          const labels = labelLookup.get(route);
          if (!labels) return null;
          const label = isRTL ? labels.ar : labels.en;
          return (
            <li key={route} className="group/adminfav flex items-center">
              <NavLink
                to={route}
                title={label}
                aria-label={label}
                onClick={closeMobile}
                activeClassName=""
                className="flex-1 min-w-0 truncate text-[12px] rounded-md px-2 py-1 text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                {label}
              </NavLink>
              <button
                type="button"
                onClick={() => remove(route)}
                aria-label={isRTL ? 'إزالة من المثبّتة' : 'Unpin'}
                className="opacity-0 group-hover/adminfav:opacity-100 transition-opacity text-sidebar-foreground/50 hover:text-destructive p-1"
              >
                <X className="w-3 h-3" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};