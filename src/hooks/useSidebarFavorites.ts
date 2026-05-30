import { useCallback, useEffect, useState } from 'react';

/**
 * NAVIGATION-ARCHITECTURE-REBUILD-1
 *
 * Per-user sidebar favorites. Stores up to {@link MAX_FAVORITES} route
 * paths in localStorage and exposes a tiny add/remove/toggle API plus a
 * cross-tab `storage` subscription so a star toggled in one tab updates
 * the other.
 *
 * Storage key follows the project convention: `qitaat_sidebar_favs_v1`.
 */
const STORAGE_KEY = 'qitaat_sidebar_favs_v1';
export const MAX_FAVORITES = 8;

function readStored(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_FAVORITES);
  } catch {
    return [];
  }
}

function writeStored(next: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, MAX_FAVORITES)));
  } catch {
    /* quota / private-mode — silently ignore */
  }
}

export function useSidebarFavorites(): {
  favorites: string[];
  isFavorite: (url: string) => boolean;
  add: (url: string) => void;
  remove: (url: string) => void;
  toggle: (url: string) => void;
  clear: () => void;
} {
  const [favorites, setFavorites] = useState<string[]>(() => readStored());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setFavorites(readStored());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persist = useCallback((next: string[]) => {
    setFavorites(next);
    writeStored(next);
  }, []);

  const add = useCallback(
    (url: string) => {
      if (!url || typeof url !== 'string') return;
      setFavorites((prev) => {
        if (prev.includes(url)) return prev;
        const next = [url, ...prev].slice(0, MAX_FAVORITES);
        writeStored(next);
        return next;
      });
    },
    [],
  );

  const remove = useCallback((url: string) => {
    setFavorites((prev) => {
      const next = prev.filter((u) => u !== url);
      writeStored(next);
      return next;
    });
  }, []);

  const toggle = useCallback((url: string) => {
    setFavorites((prev) => {
      const next = prev.includes(url)
        ? prev.filter((u) => u !== url)
        : [url, ...prev].slice(0, MAX_FAVORITES);
      writeStored(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => persist([]), [persist]);

  const isFavorite = useCallback((url: string) => favorites.includes(url), [favorites]);

  return { favorites, isFavorite, add, remove, toggle, clear };
}