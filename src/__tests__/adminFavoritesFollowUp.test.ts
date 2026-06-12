import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import {
  useAdminFavorites,
  ADMIN_FAVORITES_STORAGE_KEY,
  MAX_ADMIN_FAVORITES,
} from '../hooks/useAdminFavorites';
import { ADMIN_NAV_ITEMS } from '../modules/admin-shell';

/**
 * ADMIN-REDESIGN PHASE 3F — Favorites Follow-Up
 *
 * Guards:
 *  - namespaced localStorage key (`qitaat_admin_favorites_v1`)
 *  - pin/unpin add and remove routes
 *  - duplicates collapse to one entry
 *  - hidden / unauthorized nav items can NOT be pinned
 */

const firstPinnable = ADMIN_NAV_ITEMS.find(
  (it) => !it.hiddenInSidebar && it.isPinnedAllowed !== false && it.permission !== 'super_admin',
);
const secondPinnable = ADMIN_NAV_ITEMS.find(
  (it) =>
    !it.hiddenInSidebar &&
    it.isPinnedAllowed !== false &&
    it.permission !== 'super_admin' &&
    it !== firstPinnable,
);
const hiddenItem = ADMIN_NAV_ITEMS.find((it) => it.hiddenInSidebar);
const superAdminItem = ADMIN_NAV_ITEMS.find((it) => it.permission === 'super_admin');

describe('Phase 3F — useAdminFavorites', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('uses the namespaced localStorage key', () => {
    expect(ADMIN_FAVORITES_STORAGE_KEY).toBe('qitaat_admin_favorites_v1');
    expect(typeof MAX_ADMIN_FAVORITES).toBe('number');
    expect(MAX_ADMIN_FAVORITES).toBeGreaterThan(0);
  });

  it('pin/unpin adds and removes a route, persisting under the namespaced key', () => {
    expect(firstPinnable).toBeDefined();
    const route = firstPinnable!.route;

    const { result } = renderHook(() => useAdminFavorites({ isSuperAdmin: false }));

    act(() => result.current.toggle(route));
    expect(result.current.favorites).toContain(route);
    expect(result.current.isFavorite(route)).toBe(true);

    const raw = window.localStorage.getItem(ADMIN_FAVORITES_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toContain(route);

    act(() => result.current.toggle(route));
    expect(result.current.favorites).not.toContain(route);
    expect(result.current.isFavorite(route)).toBe(false);
  });

  it('rejects duplicate pins for the same route', () => {
    expect(firstPinnable).toBeDefined();
    const route = firstPinnable!.route;

    const { result } = renderHook(() => useAdminFavorites({ isSuperAdmin: false }));
    act(() => result.current.add(route));
    act(() => result.current.add(route));
    act(() => result.current.add(route));

    expect(result.current.favorites.filter((r) => r === route)).toHaveLength(1);
  });

  it('drops hidden sidebar items from the favorites set', () => {
    expect(hiddenItem).toBeDefined();
    const route = hiddenItem!.route;

    // Pre-seed storage with a hidden route to simulate a stale tab.
    window.localStorage.setItem(
      ADMIN_FAVORITES_STORAGE_KEY,
      JSON.stringify([route]),
    );

    const { result } = renderHook(() => useAdminFavorites({ isSuperAdmin: true }));
    expect(result.current.canPin(route)).toBe(false);
    expect(result.current.favorites).not.toContain(route);

    act(() => result.current.add(route));
    expect(result.current.favorites).not.toContain(route);
  });

  it('drops super-admin-only items when the caller is not a super admin', () => {
    if (!superAdminItem) return; // registry may not currently contain one
    const route = superAdminItem.route;

    const { result } = renderHook(() => useAdminFavorites({ isSuperAdmin: false }));
    expect(result.current.canPin(route)).toBe(false);
    act(() => result.current.add(route));
    expect(result.current.favorites).not.toContain(route);
  });

  it('preserves order (most-recent first) and allows multiple distinct pins', () => {
    expect(firstPinnable && secondPinnable).toBeTruthy();
    const a = firstPinnable!.route;
    const b = secondPinnable!.route;

    const { result } = renderHook(() => useAdminFavorites({ isSuperAdmin: false }));
    act(() => result.current.add(a));
    act(() => result.current.add(b));

    expect(result.current.favorites[0]).toBe(b);
    expect(result.current.favorites[1]).toBe(a);
  });
});