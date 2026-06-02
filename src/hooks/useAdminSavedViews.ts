/**
 * useAdminSavedViews — localStorage-backed saved views per admin page.
 *
 * A "view" is an arbitrary JSON-serializable filter snapshot keyed by a
 * page-scoped namespace (e.g. `admin.businesses`). Saved views let admins
 * jump back to a frequently-used filter/sort combination in one click.
 *
 * No server round-trip — purely client-side; sync across tabs via the
 * native `storage` event.
 */
import { useCallback, useEffect, useState } from 'react';

export interface SavedView<T = Record<string, unknown>> {
  id: string;
  name: string;
  filters: T;
  createdAt: number;
}

const PREFIX = 'qitaat_admin_saved_views_';

function readViews<T>(namespace: string): SavedView<T>[] {
  try {
    const raw = localStorage.getItem(PREFIX + namespace);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedView<T>[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeViews<T>(namespace: string, views: SavedView<T>[]): void {
  try {
    localStorage.setItem(PREFIX + namespace, JSON.stringify(views));
  } catch {
    /* quota or disabled storage — silent */
  }
}

export function useAdminSavedViews<T extends Record<string, unknown>>(
  namespace: string,
) {
  const [views, setViews] = useState<SavedView<T>[]>(() => readViews<T>(namespace));

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === PREFIX + namespace) setViews(readViews<T>(namespace));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [namespace]);

  const save = useCallback(
    (name: string, filters: T): SavedView<T> => {
      const view: SavedView<T> = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: name.trim() || 'Untitled',
        filters,
        createdAt: Date.now(),
      };
      const next = [view, ...readViews<T>(namespace)].slice(0, 20);
      writeViews(namespace, next);
      setViews(next);
      return view;
    },
    [namespace],
  );

  const remove = useCallback(
    (id: string) => {
      const next = readViews<T>(namespace).filter((v) => v.id !== id);
      writeViews(namespace, next);
      setViews(next);
    },
    [namespace],
  );

  const clear = useCallback(() => {
    writeViews<T>(namespace, []);
    setViews([]);
  }, [namespace]);

  return { views, save, remove, clear };
}

export default useAdminSavedViews;