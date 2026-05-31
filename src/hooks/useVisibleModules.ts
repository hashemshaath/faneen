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
 * NOT an authorization boundary — RLS remains authoritative. Admin pages are
 * outside this catalog, while dashboard modules respect the same visibility
 * rules for every signed-in viewer.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';
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

interface RouteVisibilityEntry {
  route: string;
  enabled: boolean;
}

const EMPTY: EffectiveVisibility[] = [];

const MODULE_ROUTE_ALIASES: Record<string, readonly string[]> = {
  business_info: ['/dashboard/business-edit', '/dashboard/business'],
  service_areas: ['/dashboard/provider/service-areas', '/dashboard/service-areas'],
  verification_badge: ['/dashboard/badge', '/dashboard/verification'],
  customers: ['/dashboard/clients', '/dashboard/customers'],
  quote_requests: ['/dashboard/rfq', '/dashboard/quote-requests'],
  quote_inbox: ['/dashboard/rfq/inbox', '/dashboard/quote-inbox'],
  quotes: ['/dashboard/provider/leads', '/dashboard/quotes'],
  contract_analytics: ['/dashboard/contract-analytics', '/dashboard/contracts/analytics'],
  warranty: ['/dashboard/warranties', '/dashboard/warranty'],
  memberships: ['/membership', '/dashboard/memberships'],
  membership_credits: ['/dashboard/provider/membership', '/dashboard/membership-credits'],
  rewards_store: ['/dashboard/loyalty/store', '/dashboard/rewards'],
  communication_prefs: ['/dashboard/communication-preferences', '/dashboard/settings/communication'],
  staff: ['/dashboard/settings/staff', '/dashboard/team'],
  staff_permissions: ['/dashboard/settings/staff-access', '/dashboard/team-access'],
};

export function useVisibleModules(): UseVisibleModulesResult {
  const { user } = useAuth();
  const ws = useActiveWorkspace();
  const userId = user?.id ?? null;
  const entityId = ws.active_entity_id ?? null;

  const visibility = useQuery({
    queryKey: ['system-access', 'visible-modules', userId, entityId],
    enabled: !!userId && !ws.isLoading,
    staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return EMPTY;
      try {
        return await getUserVisibleModules(userId, entityId);
      } catch {
        // Fail open — never block the UI on a visibility lookup error.
        return EMPTY;
      }
    },
  });

  const catalog = useQuery({
    queryKey: ['system-access', 'catalog'],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SystemModule[]> => {
      try {
        return await listSystemModules();
      } catch {
        return [];
      }
    },
  });

  const routeVisibility = useMemo((): RouteVisibilityEntry[] => {
    const rows = visibility.data ?? EMPTY;
    const byKey = new Map<string, SystemModule>();
    for (const m of catalog.data ?? []) byKey.set(m.key, m);
    const out: RouteVisibilityEntry[] = [];
    for (const v of rows) {
      const meta = byKey.get(v.module_key);
      if (!meta?.route) continue;
      if (meta.is_core) continue; // safety: never hide core
      const routes = new Set([meta.route, ...(MODULE_ROUTE_ALIASES[v.module_key] ?? [])]);
      for (const route of routes) out.push({ route, enabled: v.enabled });
    }
    return out.sort((a, b) => b.route.length - a.route.length);
  }, [visibility.data, catalog.data]);

  const hiddenRoutes = useMemo(() => {
    const out = new Set<string>();
    for (const item of routeVisibility) {
      if (!item.enabled) out.add(item.route);
    }
    return out;
  }, [routeVisibility]);

  const isRouteHidden = useMemo(() => {
    if (routeVisibility.length === 0) {
      return () => false;
    }
    return (path: string | null | undefined): boolean => {
      if (!path) return false;
      for (const item of routeVisibility) {
        if (path === item.route) return !item.enabled;
        if (path.startsWith(item.route + '/')) return !item.enabled;
      }
      return false;
    };
  }, [routeVisibility]);

  return {
    modules: visibility.data ?? EMPTY,
    hiddenRoutes,
    isLoading: ws.isLoading || visibility.isLoading || catalog.isLoading,
    isRouteHidden,
  };
}

export default useVisibleModules;