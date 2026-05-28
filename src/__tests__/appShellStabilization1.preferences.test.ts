import { describe, it, expect, beforeEach } from 'vitest';
import {
  readWorkspaceState,
  clearWorkspaceState,
  setPreference,
  setSectionCollapsed,
  toggleSectionCollapsed,
  DEFAULT_PREFERENCES,
  WORKSPACE_STATE_STORAGE_KEY,
} from '@/modules/workspace/state';

describe('APP-SHELL-STAB-1 — workspace preferences', () => {
  beforeEach(() => { clearWorkspaceState(); });

  it('defaults are applied when no state exists', () => {
    const s = readWorkspaceState();
    expect(s.preferences).toEqual(DEFAULT_PREFERENCES);
  });

  it('persists compact_mode, reduced_motion, and preferred_entity_view', () => {
    setPreference('compact_mode', true);
    setPreference('reduced_motion', true);
    setPreference('preferred_entity_view', 'grid');
    const s = readWorkspaceState();
    expect(s.preferences.compact_mode).toBe(true);
    expect(s.preferences.reduced_motion).toBe(true);
    expect(s.preferences.preferred_entity_view).toBe('grid');
  });

  it('rejects invalid entity view in storage', () => {
    window.localStorage.setItem(
      WORKSPACE_STATE_STORAGE_KEY,
      JSON.stringify({ v: 1, preferences: { preferred_entity_view: 'bogus' } }),
    );
    expect(readWorkspaceState().preferences.preferred_entity_view).toBe('list');
  });

  it('sets and toggles section collapse state', () => {
    setSectionCollapsed('overview', true);
    expect(readWorkspaceState().preferences.collapsed_sections.overview).toBe(true);
    toggleSectionCollapsed('overview');
    expect(readWorkspaceState().preferences.collapsed_sections.overview).toBe(false);
    toggleSectionCollapsed('new-section');
    expect(readWorkspaceState().preferences.collapsed_sections['new-section']).toBe(true);
  });

  it('survives a simulated refresh', () => {
    setPreference('compact_mode', true);
    setSectionCollapsed('staff', true);
    const after = readWorkspaceState();
    expect(after.preferences.compact_mode).toBe(true);
    expect(after.preferences.collapsed_sections.staff).toBe(true);
  });

  it('sanitizes malformed preferences payloads', () => {
    window.localStorage.setItem(
      WORKSPACE_STATE_STORAGE_KEY,
      JSON.stringify({ v: 1, preferences: { compact_mode: 'yes', collapsed_sections: { x: 'no' } } }),
    );
    const s = readWorkspaceState();
    expect(s.preferences.compact_mode).toBe(false);
    expect(s.preferences.collapsed_sections).toEqual({});
  });
});