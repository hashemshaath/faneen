import { describe, it, expect, beforeEach } from 'vitest';
import {
  readWorkspaceState,
  setActiveEntity,
  setActiveTeam,
  setLastModule,
  setLastContext,
  pushRecentRef,
  pushRecentRoute,
  togglePinnedRef,
  pushRecentSearch,
  clearWorkspaceState,
  MAX_RECENT_REFS,
  MAX_RECENT_ROUTES,
  MAX_PINNED_REFS,
  MAX_RECENT_SEARCHES,
  WORKSPACE_STATE_STORAGE_KEY,
} from '@/modules/workspace/state';

describe('APP-SHELL-2 — workspace state store', () => {
  beforeEach(() => { clearWorkspaceState(); });

  it('starts empty', () => {
    const s = readWorkspaceState();
    expect(s.active_entity_id).toBeNull();
    expect(s.recent_refs).toEqual([]);
    expect(s.pinned_refs).toEqual([]);
    expect(s.last_module).toBeNull();
    expect(s.last_context).toBeNull();
  });

  it('persists active entity + team + last module across reads', () => {
    setActiveEntity('e-1');
    setActiveTeam('t-1');
    setLastModule('work-orders');
    const s = readWorkspaceState();
    expect(s.active_entity_id).toBe('e-1');
    expect(s.active_team_id).toBe('t-1');
    expect(s.last_module).toBe('work-orders');
  });

  it('persists last_context', () => {
    setLastContext({ entity_id: 'e-1', ref: 'WO-1', module: 'work-orders', source: 'route' });
    expect(readWorkspaceState().last_context?.ref).toBe('WO-1');
  });

  it('dedupes and caps recent refs', () => {
    pushRecentRef({ ref: 'WO-1', label: 'a', path: '/x' });
    pushRecentRef({ ref: 'WO-2', label: 'b', path: '/y' });
    pushRecentRef({ ref: 'WO-1', label: 'a2', path: '/x' });
    const refs = readWorkspaceState().recent_refs;
    expect(refs.map((r) => r.ref)).toEqual(['WO-1', 'WO-2']);
    expect(refs[0].label).toBe('a2');
    for (let i = 0; i < MAX_RECENT_REFS + 5; i++) {
      pushRecentRef({ ref: `R-${i}`, label: `l${i}`, path: `/p/${i}` });
    }
    expect(readWorkspaceState().recent_refs).toHaveLength(MAX_RECENT_REFS);
  });

  it('dedupes recent routes by path', () => {
    pushRecentRoute({ path: '/a' });
    pushRecentRoute({ path: '/b' });
    pushRecentRoute({ path: '/a' });
    const routes = readWorkspaceState().recent_routes;
    expect(routes.map((r) => r.path)).toEqual(['/a', '/b']);
    for (let i = 0; i < MAX_RECENT_ROUTES + 5; i++) pushRecentRoute({ path: `/r/${i}` });
    expect(readWorkspaceState().recent_routes).toHaveLength(MAX_RECENT_ROUTES);
  });

  it('toggles pinned refs (add/remove) and caps', () => {
    togglePinnedRef({ ref: 'WO-1', label: 'a', path: '/x' });
    expect(readWorkspaceState().pinned_refs).toHaveLength(1);
    togglePinnedRef({ ref: 'WO-1', label: 'a', path: '/x' });
    expect(readWorkspaceState().pinned_refs).toHaveLength(0);
    for (let i = 0; i < MAX_PINNED_REFS + 3; i++) {
      togglePinnedRef({ ref: `P-${i}`, label: 'x', path: `/p/${i}` });
    }
    expect(readWorkspaceState().pinned_refs).toHaveLength(MAX_PINNED_REFS);
  });

  it('dedupes and caps recent searches; ignores empty queries', () => {
    pushRecentSearch(' ');
    expect(readWorkspaceState().recent_searches).toEqual([]);
    pushRecentSearch('foo');
    pushRecentSearch('bar');
    pushRecentSearch('foo');
    expect(readWorkspaceState().recent_searches.map((s) => s.query)).toEqual(['foo', 'bar']);
    for (let i = 0; i < MAX_RECENT_SEARCHES + 5; i++) pushRecentSearch(`q${i}`);
    expect(readWorkspaceState().recent_searches).toHaveLength(MAX_RECENT_SEARCHES);
  });

  it('rejects malformed payloads', () => {
    window.localStorage.setItem(WORKSPACE_STATE_STORAGE_KEY, 'garbage');
    expect(readWorkspaceState().recent_refs).toEqual([]);
    window.localStorage.setItem(WORKSPACE_STATE_STORAGE_KEY, JSON.stringify({ v: 99 }));
    expect(readWorkspaceState().recent_refs).toEqual([]);
  });

  it('recovery: state survives a simulated refresh', () => {
    setActiveEntity('e-recover');
    setLastModule('contracts');
    pushRecentRef({ ref: 'CNT-1', label: 'C1', path: '/dashboard/contracts' });
    const after = readWorkspaceState();
    expect(after.active_entity_id).toBe('e-recover');
    expect(after.last_module).toBe('contracts');
    expect(after.recent_refs[0].ref).toBe('CNT-1');
  });
});