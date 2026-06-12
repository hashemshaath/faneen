import { useCallback, useEffect, useMemo, useState } from 'react';
import { ADMIN_NAV_ITEMS, type AdminNavItem } from '@/modules/admin-shell';

/**
 * ADMIN-REDESIGN PHASE 3F — Favorites Follow-Up
 *
 * Admin-scoped pinned routes. Stores up to {@link MAX_ADMIN_FAVORITES}
 * admin route paths in localStorage under a dedicated, namespaced key
 * (`qitaat_admin_favorites_v1`) — independent from the generic sidebar
 * favorites used by provider/user audiences.
 *
 * Validation rules (enforced at read AND write time so an attacker /
 * stale tab cannot smuggle hidden routes into the section):
 *   - the route MUST be declared in `ADMIN_NAV_ITEMS`
 *   - items flagged `hiddenInSidebar: true` are NOT pinnable
 *   - items flagged `isPinnedAllowed: false` are NOT pinnable
 *   - items requiring `super_admin` are dropped when the caller is not
 *     a super admin
 *   - duplicates are collapsed; order preserved (most-recent first)
 */
export const ADMIN_FAVORITES_STORAGE_KEY = 'qitaat_admin_favorites_v1';
export const MAX_ADMIN_FAVORITES = 8;

export interface UseAdminFavoritesContext {
  /** When true, super-admin-only routes are pinnable. */
  isSuperAdmin?: boolean;
}

export interface UseAdminFavoritesResult {
  /** Pinned routes after validation/filtering. */
  favorites: string[];
  isFavorite: (route: string) => boolean;
  /** Returns true when `route` exists in the registry and is pinnable. */
  canPin: (route: string) => boolean;
  add: (route: string) => void;
  remove: (route: string) => void;
  toggle: (route: string) => void;
  clear: () => void;
}

function isPinnable(item: AdminNavItem | undefined, isSuperAdmin: boolean): boolean {
  if (!item) return false;
  if (item.hiddenInSidebar) return false;
  if (item.isPinnedAllowed === false) return false;
  if (item.permission === 'super_admin' && !isSuperAdmin) return false;
  return true;
}

function readStored(): string[] {
  try {
    const raw = localStorage.getItem(ADMIN_FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: string[] = [];
    for (const v of parsed) {
      if (typeof v === 'string' && !out.includes(v)) out.push(v);
      if (out.length >= MAX_ADMIN_FAVORITES) break;
    }
    return out;
  } catch {
    return [];
  }
}

function writeStored(next: readonly string[]): void {
  try {
    localStorage.setItem(
      ADMIN_FAVORITES_STORAGE_KEY,
      JSON.stringify(next.slice(0, MAX_ADMIN_FAVORITES)),
    );
  } catch {
    /* quota / private-mode — silently ignore */
  }
}

export function useAdminFavorites(
  ctx: UseAdminFavoritesContext = {},
): UseAdminFavoritesResult {
  const isSuperAdmin = ctx.isSuperAdmin === true;

  // Build a lookup once; ADMIN_NAV_ITEMS is module-constant.
  const lookup = useMemo(() => {
    const m = new Map<string, AdminNavItem>();
    for (const it of ADMIN_NAV_ITEMS) m.set(it.route, it);
    return m;
  }, []);

  const canPin = useCallback(
    (route: string): boolean => isPinnable(lookup.get(route), isSuperAdmin),
    [lookup, isSuperAdmin],
  );

  const sanitize = useCallback(
    (list: readonly string[]): string[] => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const r of list) {
        if (seen.has(r)) continue;
        if (!isPinnable(lookup.get(r), isSuperAdmin)) continue;
        seen.add(r);
        out.push(r);
        if (out.length >= MAX_ADMIN_FAVORITES) break;
      }
      return out;
    },
    [lookup, isSuperAdmin],
  );

  const [raw, setRaw] = useState<string[]>(() => readStored());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === ADMIN_FAVORITES_STORAGE_KEY) setRaw(readStored());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const favorites = useMemo(() => sanitize(raw), [raw, sanitize]);

  const commit = useCallback(
    (next: readonly string[]) => {
      const cleaned = sanitize(next);
      setRaw(cleaned);
      writeStored(cleaned);
    },
    [sanitize],
  );

  const add = useCallback(
    (route: string) => {
      if (!isPinnable(lookup.get(route), isSuperAdmin)) return;
      setRaw((prev) => {
        if (prev.includes(route)) return prev;
        const next = sanitize([route, ...prev]);
        writeStored(next);
        return next;
      });
    },
    [lookup, isSuperAdmin, sanitize],
  );

  const remove = useCallback(
    (route: string) => {
      setRaw((prev) => {
        if (!prev.includes(route)) return prev;
        const next = sanitize(prev.filter((r) => r !== route));
        writeStored(next);
        return next;
      });
    },
    [sanitize],
  );

  const toggle = useCallback(
    (route: string) => {
      if (!isPinnable(lookup.get(route), isSuperAdmin)) return;
      setRaw((prev) => {
        const next = prev.includes(route)
          ? prev.filter((r) => r !== route)
          : [route, ...prev];
        const cleaned = sanitize(next);
        writeStored(cleaned);
        return cleaned;
      });
    },
    [lookup, isSuperAdmin, sanitize],
  );

  const clear = useCallback(() => commit([]), [commit]);

  const isFavorite = useCallback(
    (route: string) => favorites.includes(route),
    [favorites],
  );

  return { favorites, isFavorite, canPin, add, remove, toggle, clear };
}