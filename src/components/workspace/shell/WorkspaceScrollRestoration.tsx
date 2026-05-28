/**
 * APP-SHELL-STABILIZATION-1 — Per-route scroll restoration.
 *
 * Saves the dashboard `<main>` scrollTop per pathname in sessionStorage
 * and restores it on back/forward navigation. New paths reset to top.
 *
 * Pure UI; no DB. Render once inside DashboardLayout.
 */
import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const STORAGE_KEY = 'qitaat_shell_scroll_v1';

function readMap(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, number> : {};
  } catch { return {}; }
}

function writeMap(map: Record<string, number>): void {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch { /* noop */ }
}

export const WorkspaceScrollRestoration: React.FC = () => {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    // Find the dashboard main element (the only scroll container in shell).
    const main = document.querySelector('main');
    if (!main) return;

    // Save previous path's scrollTop before switching.
    if (prevPath.current && prevPath.current !== pathname) {
      const map = readMap();
      map[prevPath.current] = main.scrollTop;
      writeMap(map);
    }

    // On POP (back/forward), restore. On PUSH, scroll to top.
    if (navType === 'POP') {
      const map = readMap();
      const saved = map[pathname];
      main.scrollTo({ top: typeof saved === 'number' ? saved : 0, behavior: 'auto' });
    } else {
      main.scrollTo({ top: 0, behavior: 'auto' });
    }

    prevPath.current = pathname;
  }, [pathname, navType]);

  return null;
};

export default WorkspaceScrollRestoration;