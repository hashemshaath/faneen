/**
 * APP-SHELL-STABILIZATION-1 — React adapter for workspace UI preferences.
 *
 * Mirrors the preferences slice of workspaceStateStore. Honours the OS
 * `prefers-reduced-motion` setting as a fallback when the user hasn't
 * explicitly toggled the preference.
 *
 * Security: UI-only; no DB, no auth.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  readWorkspaceState,
  setPreference as _setPreference,
  setSectionCollapsed as _setSectionCollapsed,
  toggleSectionCollapsed as _toggleSectionCollapsed,
  DEFAULT_PREFERENCES,
  WORKSPACE_STATE_STORAGE_KEY,
  type WorkspacePreferences,
  type EntityViewMode,
} from '@/modules/workspace/state';

export interface UseWorkspacePreferences extends WorkspacePreferences {
  /** Effective reduced-motion: explicit preference OR OS media query. */
  effective_reduced_motion: boolean;
  setCompactMode: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  setPreferredEntityView: (v: EntityViewMode) => void;
  setSectionCollapsed: (id: string, collapsed: boolean) => void;
  toggleSectionCollapsed: (id: string) => void;
  isSectionCollapsed: (id: string, fallback?: boolean) => boolean;
}

function readPrefs(): WorkspacePreferences {
  return readWorkspaceState().preferences ?? DEFAULT_PREFERENCES;
}

function readOsReducedMotion(): boolean {
  try {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function useWorkspacePreferences(): UseWorkspacePreferences {
  const [prefs, setPrefs] = useState<WorkspacePreferences>(() => readPrefs());
  const [osReduced, setOsReduced] = useState<boolean>(() => readOsReducedMotion());

  useEffect(() => {
    const sync = () => setPrefs(readPrefs());
    const onStorage = (e: StorageEvent) => {
      if (e.key === WORKSPACE_STATE_STORAGE_KEY) sync();
    };
    window.addEventListener('storage', onStorage);

    let mql: MediaQueryList | null = null;
    const onMq = () => setOsReduced(readOsReducedMotion());
    try {
      mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      mql.addEventListener?.('change', onMq);
    } catch { /* noop */ }

    return () => {
      window.removeEventListener('storage', onStorage);
      try { mql?.removeEventListener?.('change', onMq); } catch { /* noop */ }
    };
  }, []);

  const setCompactMode = useCallback((v: boolean) => {
    setPrefs(_setPreference('compact_mode', v).preferences);
  }, []);
  const setReducedMotion = useCallback((v: boolean) => {
    setPrefs(_setPreference('reduced_motion', v).preferences);
  }, []);
  const setPreferredEntityView = useCallback((v: EntityViewMode) => {
    setPrefs(_setPreference('preferred_entity_view', v).preferences);
  }, []);
  const setSectionCollapsed = useCallback((id: string, collapsed: boolean) => {
    setPrefs(_setSectionCollapsed(id, collapsed).preferences);
  }, []);
  const toggleSectionCollapsed = useCallback((id: string) => {
    setPrefs(_toggleSectionCollapsed(id).preferences);
  }, []);
  const isSectionCollapsed = useCallback(
    (id: string, fallback = false) =>
      Object.prototype.hasOwnProperty.call(prefs.collapsed_sections, id)
        ? !!prefs.collapsed_sections[id]
        : fallback,
    [prefs.collapsed_sections],
  );

  return {
    ...prefs,
    effective_reduced_motion: prefs.reduced_motion || osReduced,
    setCompactMode,
    setReducedMotion,
    setPreferredEntityView,
    setSectionCollapsed,
    toggleSectionCollapsed,
    isSectionCollapsed,
  };
}