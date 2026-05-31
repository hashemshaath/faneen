/**
 * SYSTEM-ACCESS — UI visibility hook backed by `get_user_visible_modules`.
 *
 * Resolves the effective per-user module visibility (User Override >
 * Account Type Override > Global Default > Module Default) and exposes:
 *
 *   - modules:      raw rows from the RPC
 *   - hiddenRoutes: Set<string> of routes the admin has disabled
 *   - isRouteHidden(path): boolean — true when a disabled module owns
 *                          this path (exact match or path prefix)
 *
 * NOT an authorization boundary — RLS remains authoritative. Admins and
 * super-admins always bypass (they need to see everything to manage it).
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import {
  getUserVisibleModules,
  listSystemModules,
  type EffectiveVisibility,
  type SystemModule,
} from '@/modules/systemAccess';

export interface UseVisibleModulesResult {
  modules: EffectiveVisibility[];
  hiddenRoutes: Set<string>;
  isLoading: boolean;
  isRouteHidden: (path: string | null | undefined) => boolean;
}

const EMPTY: EffectiveVisibility[] = [];

export function useVisibleModules(): UseVisibleModulesResult {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const userId = user?.id ?? null;
  const bypass = !!(isAdmin || isSuperAdmin);

  const visibility = useQuery({
    queryKey: ['system-access', 'visible-modules', userId],
    enabled: !!userId && !bypass,
    staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return EMPTY;
      try {
        return await getUserVisibleModules(userId);
      } catch {
        // Fail open — never block the UI on a visibility lookup error.
        return EMPTY;
      }
    },
  });

  const catalog = useQuery({
    queryKey: ['system-access', 'catalog'],
    enabled: !!userId && !bypass,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SystemModule[]> => {
      try {
        return await listSystemModules();
      } catch {
        return [];
      }
    },
  });

  const hiddenRoutes = useMemo(() => {
    if (bypass) return new Set<string>();
    const rows = visibility.data ?? EMPTY;
    const byKey = new Map<string, SystemModule>();
    for (const m of catalog.data ?? []) byKey.set(m.key, m);
    const out = new Set<string>();
    for (const v of rows) {
      if (v.enabled) continue;
      const meta = byKey.get(v.module_key);
      if (!meta?.route) continue;
      if (meta.is_core) continue; // safety: never hide core
      out.add(meta.route);
    }
    return out;
  }, [bypass, visibility.data, catalog.data]);

  const isRouteHidden = useMemo(() => {
    if (bypass || hiddenRoutes.size === 0) {
      return () => false;
    }
    const list = Array.from(hiddenRoutes);
    return (path: string | null | undefined): boolean => {
      if (!path) return false;
      for (const r of list) {
        if (path === r) return true;
        if (path.startsWith(r + '/')) return true;
      }
      return false;
    };
  }, [bypass, hiddenRoutes]);

  return {
    modules: visibility.data ?? EMPTY,
    hiddenRoutes,
    isLoading: !bypass && (visibility.isLoading || catalog.isLoading),
    isRouteHidden,
  };
}

export default useVisibleModules;