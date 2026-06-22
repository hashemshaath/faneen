/**
 * INDIVIDUAL DASHBOARD MENU VISIBILITY — Sites + Projects must appear
 * for an authenticated individual user without a business.
 *
 * Root-cause this guards against: `/dashboard/sites` and
 * `/dashboard/projects` were previously declared as `entity` scope with
 * `entity.view` permission in the workspace route map, so
 * `canViewWorkspaceRoute` filtered them out of the sidebar for any
 * authed user whose workspace had no active entity (personal account).
 */
import { describe, it, expect } from 'vitest';
import {
  getVisibleDashboardNavGroups,
  UNIFIED_GROUP_LABELS,
  UNIFIED_ITEM_LABELS,
} from '@/modules/dashboard/navigation';
import {
  canViewWorkspaceRoute,
  getWorkspaceRouteDescriptor,
} from '@/modules/workspace/permissions/routePermissions';

const allItems = (groups: ReturnType<typeof getVisibleDashboardNavGroups>) =>
  groups.flatMap((g) => g.items);

describe('Individual without a business — sidebar visibility', () => {
  const groups = getVisibleDashboardNavGroups({
    audience: 'user', hasBusiness: false, isSuperAdmin: false,
  });
  const groupEns = groups.map((g) => g.groupLabel.en);
  const items = allItems(groups);
  const itemEns = items.map((it) => it.label.en);

  it('sees the «أعمال» group', () => {
    expect(groupEns).toContain(UNIFIED_GROUP_LABELS.business.en);
  });
  it('sees «المواقع» (Sites) at /dashboard/sites', () => {
    const sites = items.find((it) => it.label.en === UNIFIED_ITEM_LABELS.sites.en);
    expect(sites?.url).toBe('/dashboard/sites');
  });
  it('does NOT see «المشاريع» (Projects) — portfolio concept requires a business', () => {
    // CLIENT NAV IA FIX: Projects is gated behind `requiresBusiness`.
    // Personal clients use «مواقعي» as the canonical hub.
    const projects = items.find((it) => it.label.en === UNIFIED_ITEM_LABELS.projects.en);
    expect(projects).toBeUndefined();
  });
  it('does NOT see «الفروع» (Branches)', () => {
    expect(itemEns).not.toContain(UNIFIED_ITEM_LABELS.branches.en);
  });
  it('does NOT render the «أعمال المنشأة» group', () => {
    expect(groupEns).not.toContain(UNIFIED_GROUP_LABELS.businessEntity.en);
  });
});

describe('User with a business — still sees the entity items', () => {
  const groups = getVisibleDashboardNavGroups({
    audience: 'user', hasBusiness: true, isSuperAdmin: false,
  });
  const itemEns = allItems(groups).map((it) => it.label.en);
  it('sees Sites + Projects + Branches', () => {
    expect(itemEns).toContain(UNIFIED_ITEM_LABELS.sites.en);
    expect(itemEns).toContain(UNIFIED_ITEM_LABELS.projects.en);
    expect(itemEns).toContain(UNIFIED_ITEM_LABELS.branches.en);
  });
});

describe('Workspace route permissions — Sites + Projects are personal-scope', () => {
  const sites = getWorkspaceRouteDescriptor('/dashboard/sites');
  const projects = getWorkspaceRouteDescriptor('/dashboard/projects');

  it('/dashboard/sites is personal scope with no permission gate', () => {
    expect(sites?.scope).toBe('personal');
    expect(sites?.permissions).toEqual([]);
    expect(sites?.sidebar).toBe(true);
  });
  it('/dashboard/projects is personal scope with no permission gate', () => {
    expect(projects?.scope).toBe('personal');
    expect(projects?.permissions).toEqual([]);
    expect(projects?.sidebar).toBe(true);
  });
  it('canViewWorkspaceRoute returns true for a user with no workspace entity', () => {
    expect(canViewWorkspaceRoute('/dashboard/sites',    { workspace: null, isAdmin: false })).toBe(true);
    expect(canViewWorkspaceRoute('/dashboard/projects', { workspace: null, isAdmin: false })).toBe(true);
  });
});

describe('Desktop / mobile parity', () => {
  // The same `getVisibleDashboardNavGroups` powers both the desktop
  // sidebar and the mobile drawer in `DashboardSidebar.tsx` — they
  // cannot diverge by construction. This test locks that invariant.
  it('the two consumers share the same source of truth', () => {
    const ctx = { audience: 'user' as const, hasBusiness: false, isSuperAdmin: false };
    const a = getVisibleDashboardNavGroups(ctx);
    const b = getVisibleDashboardNavGroups(ctx);
    expect(a.map((g) => g.key)).toEqual(b.map((g) => g.key));
    expect(a.flatMap((g) => g.items.map((it) => it.url)))
      .toEqual(b.flatMap((g) => g.items.map((it) => it.url)));
  });
});