import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import {
  ADMIN_DASHBOARD_WIDGETS,
  ADMIN_DASHBOARD_QUICK_ACTIONS,
  ADMIN_DASHBOARD_DEFAULT_ORDER,
  ADMIN_DASHBOARD_LAYOUT_KEY,
  useAdminDashboardLayout,
  getAdminWidget,
} from '@/modules/admin-dashboard';
import { ADMIN_NAV_ITEMS } from '@/modules/admin-shell';

/**
 * ADMIN-REDESIGN PHASE 4 — Dashboard widgets + personalization guards.
 */
describe('Phase 4 — admin dashboard widget registry', () => {
  it('every widget has a unique id, ar/en titles, icon, group, permission', () => {
    const seen = new Set<string>();
    for (const w of ADMIN_DASHBOARD_WIDGETS) {
      expect(typeof w.id).toBe('string');
      expect(w.id.length).toBeGreaterThan(0);
      expect(seen.has(w.id), `duplicate widget id: ${w.id}`).toBe(false);
      seen.add(w.id);
      expect(w.titleAr.length).toBeGreaterThan(0);
      expect(w.titleEn.length).toBeGreaterThan(0);
      expect(typeof w.icon).toBeDefined();
      expect(['overview', 'operations', 'users-entities', 'finance', 'system-health', 'activity']).toContain(w.group);
      expect(['admin', 'super_admin']).toContain(w.permission);
    }
  });

  it('default order has no duplicates and matches the registry size', () => {
    expect(new Set(ADMIN_DASHBOARD_DEFAULT_ORDER).size).toBe(ADMIN_DASHBOARD_DEFAULT_ORDER.length);
    expect(ADMIN_DASHBOARD_DEFAULT_ORDER.length).toBe(ADMIN_DASHBOARD_WIDGETS.length);
  });

  it('every quick action targets a route declared in ADMIN_NAV_ITEMS', () => {
    const navRoutes = new Set(ADMIN_NAV_ITEMS.map((it) => it.route));
    for (const qa of ADMIN_DASHBOARD_QUICK_ACTIONS) {
      expect(navRoutes.has(qa.route), `quick action ${qa.id} -> ${qa.route} missing in admin nav registry`).toBe(true);
    }
  });

  it('quick action ids are unique', () => {
    const ids = ADMIN_DASHBOARD_QUICK_ACTIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Phase 4 — useAdminDashboardLayout', () => {
  beforeEach(() => window.localStorage.clear());

  it('uses the namespaced localStorage key', () => {
    expect(ADMIN_DASHBOARD_LAYOUT_KEY).toBe('qitaat_admin_dashboard_layout_v1');
  });

  it('returns default visible order when nothing is stored', () => {
    const { result } = renderHook(() => useAdminDashboardLayout());
    expect(result.current.visibleOrder).toEqual([...ADMIN_DASHBOARD_DEFAULT_ORDER]);
    expect(result.current.hidden).toEqual([]);
  });

  it('toggleHidden hides a widget and reset restores defaults', () => {
    const hideable = ADMIN_DASHBOARD_WIDGETS.find((w) => w.hideable);
    expect(hideable).toBeDefined();
    const id = hideable!.id;

    const { result } = renderHook(() => useAdminDashboardLayout());

    act(() => result.current.toggleHidden(id));
    expect(result.current.isHidden(id)).toBe(true);
    expect(result.current.visibleOrder).not.toContain(id);

    // persisted under namespaced key
    const raw = window.localStorage.getItem(ADMIN_DASHBOARD_LAYOUT_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.hidden).toContain(id);

    act(() => result.current.reset());
    expect(result.current.hidden).toEqual([]);
    expect(result.current.visibleOrder).toEqual([...ADMIN_DASHBOARD_DEFAULT_ORDER]);
  });

  it('non-hideable widgets cannot be hidden, even if a stale tab tries', () => {
    const fixed = ADMIN_DASHBOARD_WIDGETS.find((w) => !w.hideable);
    expect(fixed).toBeDefined();
    const id = fixed!.id;

    // simulate stale tab writing a bad payload
    window.localStorage.setItem(
      ADMIN_DASHBOARD_LAYOUT_KEY,
      JSON.stringify({ order: [...ADMIN_DASHBOARD_DEFAULT_ORDER], hidden: [id] }),
    );

    const { result } = renderHook(() => useAdminDashboardLayout());
    expect(result.current.canHide(id)).toBe(false);
    expect(result.current.isHidden(id)).toBe(false);
    expect(result.current.visibleOrder).toContain(id);

    act(() => result.current.hide(id));
    expect(result.current.isHidden(id)).toBe(false);
  });

  it('unknown widget ids in storage are dropped silently', () => {
    window.localStorage.setItem(
      ADMIN_DASHBOARD_LAYOUT_KEY,
      JSON.stringify({ order: ['__bogus__', ...ADMIN_DASHBOARD_DEFAULT_ORDER], hidden: ['__nope__'] }),
    );
    const { result } = renderHook(() => useAdminDashboardLayout());
    expect(result.current.fullOrder).not.toContain('__bogus__');
    expect(result.current.hidden).not.toContain('__nope__');
  });

  it('getAdminWidget returns the expected definition or undefined', () => {
    const first = ADMIN_DASHBOARD_WIDGETS[0];
    expect(getAdminWidget(first.id)).toBe(first);
    expect(getAdminWidget('___missing___')).toBeUndefined();
  });
});