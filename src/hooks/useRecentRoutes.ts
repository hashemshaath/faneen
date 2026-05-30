import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * NAVIGATION-ARCHITECTURE-REBUILD-1
 *
 * Tracks the last {@link MAX_RECENT} distinct routes the current session
 * visited, ignoring auth shells, public token pages, and parametric paths
 * with IDs (those are rarely useful as nav shortcuts). Persisted under
 * `qitaat_sidebar_recent_v1` so it survives reloads.
 */
const STORAGE_KEY = 'qitaat_sidebar_recent_v1';
export const MAX_RECENT = 5;

const IGNORE_PREFIXES = [
  '/auth',
  '/onboarding',
  '/forbidden',
  '/dashboard/no-access',
  '/q/',
  '/r/',
  '/s/',
  '/client/',
  '/v/',
  '/staff-invite',
  '/invite',
  '/membership/payment',
];

function shouldTrack(pathname: string): boolean {
  if (!pathname || pathname === '/' || pathname === '/not-found') return false;
  if (IGNORE_PREFIXES.some((p) => pathname.startsWith(p))) return false;
  return pathname.startsWith('/dashboard') || pathname.startsWith('/admin');
}

function readStored(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function writeStored(next: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, MAX_RECENT)));
  } catch {
    /* ignore */
  }
}

/** Pure helper exported for tests. */
export function pushRecent(list: string[], path: string): string[] {
  if (!shouldTrack(path)) return list;
  const without = list.filter((p) => p !== path);
  return [path, ...without].slice(0, MAX_RECENT);
}

export function useRecentRoutes(): string[] {
  const { pathname } = useLocation();
  const [recent, setRecent] = useState<string[]>(() => readStored());

  useEffect(() => {
    if (!shouldTrack(pathname)) return;
    setRecent((prev) => {
      const next = pushRecent(prev, pathname);
      if (next === prev || (next.length === prev.length && next.every((v, i) => v === prev[i]))) {
        return prev;
      }
      writeStored(next);
      return next;
    });
  }, [pathname]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setRecent(readStored());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return recent;
}