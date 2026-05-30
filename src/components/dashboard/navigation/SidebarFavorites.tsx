import React from 'react';
import { NavLink } from '@/components/NavLink';
import { Star } from 'lucide-react';
import { useSidebarFavorites } from '@/hooks/useSidebarFavorites';

/**
 * NAVIGATION-ARCHITECTURE-REBUILD-1 — Part D
 *
 * Renders the user's pinned favorites as a small section above the main
 * menu. Each entry resolves its display label from the lookup the parent
 * sidebar already builds (label.ar/en keyed by URL), so a renamed route
 * stays in sync.
 */
export interface SidebarFavoritesProps {
  collapsed: boolean;
  isRTL: boolean;
  /** Lookup of url → bilingual label, sourced from the main menu. */
  labelLookup: Map<string, { ar: string; en: string }>;
  closeMobile: () => void;
}

export const SidebarFavorites: React.FC<SidebarFavoritesProps> = ({
  collapsed,
  isRTL,
  labelLookup,
  closeMobile,
}) => {
  const { favorites, remove } = useSidebarFavorites();
  const known = favorites.filter((u) => labelLookup.has(u));
  if (collapsed || known.length === 0) return null;

  return (
    <div className="px-3 pt-3" data-testid="sidebar-favorites">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/55 mb-1 px-1 flex items-center gap-1.5">
        <Star className="w-3 h-3 opacity-70" />
        {isRTL ? 'المفضّلة' : 'Favorites'}
      </p>
      <ul className="space-y-0.5">
        {known.map((url) => {
          const labels = labelLookup.get(url);
          if (!labels) return null;
          const label = isRTL ? labels.ar : labels.en;
          return (
            <li key={url} className="group/fav flex items-center">
              <NavLink
                to={url}
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
                onClick={() => remove(url)}
                aria-label={isRTL ? 'إزالة من المفضّلة' : 'Remove favorite'}
                className="opacity-0 group-hover/fav:opacity-100 transition-opacity text-sidebar-foreground/50 hover:text-destructive p-1"
              >
                <Star className="w-3 h-3 fill-current" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};