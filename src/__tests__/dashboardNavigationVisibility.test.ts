import { describe, it, expect } from 'vitest';
import {
  getVisibleDashboardNavGroups,
  UNIFIED_GROUP_LABELS,
  UNIFIED_ITEM_LABELS,
  CREATE_ENTITY_ROUTE,
  COMPLETE_ENTITY_ROUTE,
} from '@/modules/dashboard/navigation';

describe('DASHBOARD NAV VISIBILITY — audience + business gating', () => {
  it('user WITHOUT a business does not see the «أعمال المنشأة» group', () => {
    const groups = getVisibleDashboardNavGroups({
      audience: 'user', hasBusiness: false, isSuperAdmin: false,
    });
    const ens = groups.map((g) => g.groupLabel.en);
    expect(ens).not.toContain(UNIFIED_GROUP_LABELS.businessEntity.en);
    // …but they DO still see the personal «أعمال» group.
    expect(ens).toContain(UNIFIED_GROUP_LABELS.business.en);
  });

  it('user WITH a business sees the «أعمال المنشأة» group', () => {
    const groups = getVisibleDashboardNavGroups({
      audience: 'user', hasBusiness: true, isSuperAdmin: false,
    });
    const ens = groups.map((g) => g.groupLabel.en);
    expect(ens).toContain(UNIFIED_GROUP_LABELS.businessEntity.en);
  });

  it('provider always sees Business + Provider-Requests groups', () => {
    const groups = getVisibleDashboardNavGroups({
      audience: 'provider', hasBusiness: true, isSuperAdmin: false,
    });
    const ens = groups.map((g) => g.groupLabel.en);
    expect(ens).toContain(UNIFIED_GROUP_LABELS.business.en);
    expect(ens).toContain(UNIFIED_GROUP_LABELS.providerOps.en);
  });

  it('admin audience returns registry-driven groups only (no user/provider groups)', () => {
    const groups = getVisibleDashboardNavGroups({
      audience: 'admin', hasBusiness: true, isSuperAdmin: true,
    });
    expect(groups.length).toBeGreaterThan(0);
    const ens = groups.map((g) => g.groupLabel.en);
    expect(ens).not.toContain(UNIFIED_GROUP_LABELS.providerOps.en);
  });

  it('membership item resolves to /dashboard/membership (user) and /dashboard/provider/membership (provider)', () => {
    const u = getVisibleDashboardNavGroups({ audience: 'user', hasBusiness: true, isSuperAdmin: false });
    const p = getVisibleDashboardNavGroups({ audience: 'provider', hasBusiness: true, isSuperAdmin: false });
    const userMembership = u.flatMap((g) => g.items).find((it) => it.label.en === UNIFIED_ITEM_LABELS.membership.en);
    const provMembership  = p.flatMap((g) => g.items).find((it) => it.label.en === UNIFIED_ITEM_LABELS.membership.en);
    expect(userMembership?.url).toBe('/dashboard/membership');
    expect(provMembership?.url).toBe('/dashboard/provider/membership');
  });

  it('CTA contracts: /register-entity creates, /onboarding only completes', () => {
    expect(CREATE_ENTITY_ROUTE).toBe('/register-entity');
    expect(COMPLETE_ENTITY_ROUTE).toBe('/onboarding');
    // Neither route should ever appear as a sidebar item (CTAs only).
    for (const audience of ['user', 'provider', 'admin'] as const) {
      const groups = getVisibleDashboardNavGroups({ audience, hasBusiness: false, isSuperAdmin: false });
      const urls = groups.flatMap((g) => g.items.map((it) => it.url));
      expect(urls).not.toContain(CREATE_ENTITY_ROUTE);
      expect(urls).not.toContain(COMPLETE_ENTITY_ROUTE);
    }
  });
});