/**
 * APP-SHELL-REARCHITECTURE-2 — React adapter over the workspace-state store.
 *
 * Provides a single subscribe-once hook that mirrors localStorage state and
 * exposes mutators. Listens to `storage` events for cross-tab sync.
 *
 * Security: localStorage is UI-only. Authorization is enforced by RLS +
 * has_permission RPC, never here.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  readWorkspaceState,
  setActiveEntity as _setActiveEntity,
  setActiveTeam as _setActiveTeam,
  setLastModule as _setLastModule,
  setLastContext as _setLastContext,
  pushRecentRef as _pushRecentRef,
  pushRecentRoute as _pushRecentRoute,
  togglePinnedRef as _togglePinnedRef,
  pushRecentSearch as _pushRecentSearch,
  clearWorkspaceState as _clearWorkspaceState,
  WORKSPACE_STATE_STORAGE_KEY,
  type WorkspaceStateV1,
  type WorkspaceContextSnapshot,
  type RecentRefEntry,
  type RecentRouteEntry,
  type PinnedRefEntry,
} from '@/modules/workspace/state';

export interface UseWorkspaceState extends WorkspaceStateV1 {
  setActiveEntity: (id: string | null) => void;
  setActiveTeam: (id: string | null) => void;
  setLastModule: (m: string | null) => void;
  setLastContext: (c: WorkspaceContextSnapshot | null) => void;
  pushRecentRef: (e: Omit<RecentRefEntry, 'visited_at'>) => void;
  pushRecentRoute: (e: Omit<RecentRouteEntry, 'visited_at'>) => void;
  togglePinnedRef: (e: Omit<PinnedRefEntry, 'pinned_at'>) => void;
  pushRecentSearch: (q: string) => void;
  clear: () => void;
}

export function useWorkspaceState(): UseWorkspaceState {
  const [state, setState] = useState<WorkspaceStateV1>(() => readWorkspaceState());

  useEffect(() => {
    const sync = () => setState(readWorkspaceState());
    const onStorage = (e: StorageEvent) => {
      if (e.key === WORKSPACE_STATE_STORAGE_KEY) sync();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const wrap = <T extends unknown[]>(fn: (...args: T) => WorkspaceStateV1) =>
    useCallback((...args: T) => { setState(fn(...args)); }, [fn]);

  return {
    ...state,
    setActiveEntity: wrap(_setActiveEntity),
    setActiveTeam: wrap(_setActiveTeam),
    setLastModule: wrap(_setLastModule),
    setLastContext: wrap(_setLastContext),
    pushRecentRef: wrap(_pushRecentRef),
    pushRecentRoute: wrap(_pushRecentRoute),
    togglePinnedRef: wrap(_togglePinnedRef),
    pushRecentSearch: wrap(_pushRecentSearch),
    clear: useCallback(() => { _clearWorkspaceState(); setState(readWorkspaceState()); }, []),
  };
}