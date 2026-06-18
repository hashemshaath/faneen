import { useCallback, useEffect, useState } from 'react';

/**
 * Persisted per-user sort preference for the project category tabs.
 *
 * - Stored in `localStorage` under `qitaat_project_sort_<scope>`.
 * - `scope` keeps separate prefs across pages (`dashboard`, `profile`, `public`).
 * - Safe in SSR / non-browser contexts (falls back to default value).
 */
export type ProjectSortValue = 'newest' | 'top_rated' | 'most_completed';

export const PROJECT_SORT_VALUES: ProjectSortValue[] = ['newest', 'top_rated', 'most_completed'];

const KEY_PREFIX = 'qitaat_project_sort_';

function readPref(scope: string, fallback: ProjectSortValue): ProjectSortValue {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + scope);
    if (raw && (PROJECT_SORT_VALUES as string[]).includes(raw)) return raw as ProjectSortValue;
  } catch {/* ignore quota / disabled storage */}
  return fallback;
}

export function useProjectSortPref(
  scope: 'dashboard' | 'profile' | 'public',
  fallback: ProjectSortValue = 'newest',
): [ProjectSortValue, (v: ProjectSortValue) => void] {
  const [value, setValue] = useState<ProjectSortValue>(() => readPref(scope, fallback));

  // Keep tabs in sync across windows of the same user.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY_PREFIX + scope && e.newValue && (PROJECT_SORT_VALUES as string[]).includes(e.newValue)) {
        setValue(e.newValue as ProjectSortValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [scope]);

  const update = useCallback((v: ProjectSortValue) => {
    setValue(v);
    try { window.localStorage.setItem(KEY_PREFIX + scope, v); } catch {/* ignore */}
  }, [scope]);

  return [value, update];
}

/**
 * Apply a `ProjectSortValue` to a list of project-shaped rows.
 * Pure helper — works on dashboard, profile and public shapes which all
 * carry the same minimal fields (`created_at`, `status`, optional
 * `average_rating`/`rating`).
 */
export function sortProjects<T>(items: T[], sort: ProjectSortValue): T[] {
  const arr = [...items];
  const get = (item: T, key: string): unknown => (item as Record<string, unknown>)[key];
  if (sort === 'top_rated') {
    arr.sort((a, b) => {
      const ra = Number(get(a, 'average_rating') ?? get(a, 'rating') ?? 0);
      const rb = Number(get(b, 'average_rating') ?? get(b, 'rating') ?? 0);
      if (rb !== ra) return rb - ra;
      return new Date(String(get(b, 'created_at') ?? 0)).getTime() - new Date(String(get(a, 'created_at') ?? 0)).getTime();
    });
    return arr;
  }
  if (sort === 'most_completed') {
    arr.sort((a, b) => {
      const sa = get(a, 'status'); const sb = get(b, 'status');
      const ca = sa === 'completed' || sa === 'published' ? 1 : 0;
      const cb = sb === 'completed' || sb === 'published' ? 1 : 0;
      if (cb !== ca) return cb - ca;
      const da = new Date(String(get(a, 'completion_date') ?? get(a, 'created_at') ?? 0)).getTime();
      const db = new Date(String(get(b, 'completion_date') ?? get(b, 'created_at') ?? 0)).getTime();
      return db - da;
    });
    return arr;
  }
  // newest
  arr.sort((a, b) =>
    new Date(String(get(b, 'created_at') ?? 0)).getTime() -
    new Date(String(get(a, 'created_at') ?? 0)).getTime(),
  );
  return arr;
}