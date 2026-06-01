/**
 * ACCESS-GOVERNANCE-FINAL-1 — Canonical composing hook.
 *
 * Single entry point for "what modules can this business effectively use
 * right now?". Composes:
 *   - module catalog          (`listSystemModules`)
 *   - per-user visibility     (`get_user_visible_modules` via `getUserVisibleModules`)
 *   - optional membership map (caller-supplied, derived from `useFeatureGate` per key)
 *   - optional business status
 *
 * Calls `resolveEffectiveBusinessAccess()` and exposes `isEnabled(key)` and
 * `reasonFor(key)` so every UI surface (sidebar, command palette, dashboard
 * cards, contracts/procurement/work-orders gates) can share one answer.
 *
 * NOT an authorization boundary — RLS + the RPCs above remain authoritative.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import {
  listSystemModules,
  getUserVisibleModules,
  type EffectiveVisibility,
  type SystemModule,
} from '@/modules/systemAccess';
import {
  resolveEffectiveBusinessAccess,
  type EffectiveBusinessAccess,
  type EffectiveAccessEntry,
} from '@/modules/systemAccess/accessResolution';

export interface UseEffectiveBusinessAccessOptions {
  businessId?: string | null;
  membershipFeatures?: Record<string, boolean> | null;
  businessStatus?: 'active' | 'suspended' | 'pending' | null;
}

export interface UseEffectiveBusinessAccessResult {
  access: EffectiveBusinessAccess;
  isEnabled: (moduleKey: string | null | undefined) => boolean;
  reasonFor: (moduleKey: string | null | undefined) => EffectiveAccessEntry | null;
  isLoading: boolean;
}

const EMPTY_MODULES: SystemModule[] = [];
const EMPTY_VISIBILITY: EffectiveVisibility[] = [];

export function useEffectiveBusinessAccess(
  opts: UseEffectiveBusinessAccessOptions = {},
): UseEffectiveBusinessAccessResult {
  const { user, isAdmin } = useAuth();
  const userId = user?.id ?? null;
  const entityId = opts.businessId ?? null;

  const modulesQuery = useQuery({
    queryKey: ['system-modules'],
    queryFn: listSystemModules,
    staleTime: 5 * 60_000,
    enabled: !!userId,
  });

  const visibilityQuery = useQuery({
    queryKey: ['system-access', 'visible-modules', userId, entityId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return EMPTY_VISIBILITY;
      try {
        return await getUserVisibleModules(userId, entityId);
      } catch {
        return EMPTY_VISIBILITY;
      }
    },
  });

  const access = useMemo(
    () =>
      resolveEffectiveBusinessAccess({
        modules: modulesQuery.data ?? EMPTY_MODULES,
        visibility: visibilityQuery.data ?? EMPTY_VISIBILITY,
        membershipFeatures: opts.membershipFeatures ?? null,
        businessStatus: opts.businessStatus ?? 'active',
        isAdmin: !!isAdmin,
      }),
    [modulesQuery.data, visibilityQuery.data, opts.membershipFeatures, opts.businessStatus, isAdmin],
  );

  const entriesByKey = useMemo(() => {
    const map = new Map<string, EffectiveAccessEntry>();
    for (const e of access.entries) map.set(e.module_key, e);
    return map;
  }, [access.entries]);

  const isEnabled = useMemo(
    () => (key: string | null | undefined) => {
      if (!key) return false;
      const e = entriesByKey.get(key);
      return e ? e.enabled : false;
    },
    [entriesByKey],
  );

  const reasonFor = useMemo(
    () => (key: string | null | undefined) => (key ? entriesByKey.get(key) ?? null : null),
    [entriesByKey],
  );

  return {
    access,
    isEnabled,
    reasonFor,
    isLoading: modulesQuery.isLoading || visibilityQuery.isLoading,
  };
}

export default useEffectiveBusinessAccess;