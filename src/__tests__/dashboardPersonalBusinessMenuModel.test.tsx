import { describe, it, expect } from 'vitest';
import {
  getVisibleDashboardNavGroups,
  UNIFIED_GROUP_LABELS,
  UNIFIED_ITEM_LABELS,
  CREATE_ENTITY_ROUTE,
} from '@/modules/dashboard/navigation';

/**
 * DASHBOARD PERSONAL BUSINESS MENU MODEL
 *
 * Validates the «individual workspace + entity workspace» split:
 *  - Personal «أعمال» group is visible to everyone (user / provider).
 *  - «أعمال المنشأة» group and every requiresBusiness item are hidden
 *    until the user owns/manages a business entity.
 *  - Branches is the canonical entity-only item.
 *  - Admin uses «الجهات» (Administration / registry-driven) instead.
 */

const labelsOf = (groups: ReturnType<typeof getVisibleDashboardNavGroups>) =>
  groups.flatMap((g) => g.items.map((it) => it.label.en));

describe('individual without a business', () => {
  const groups = getVisibleDashboardNavGroups({
    audience: 'user', hasBusiness: false, isSuperAdmin: false,
  });
  const groupEns = groups.map((g) => g.groupLabel.en);
  const itemEns = labelsOf(groups);

  it('sees the personal «أعمال» group', () => {
    expect(groupEns).toContain(UNIFIED_GROUP_LABELS.business.en);
  });

  it('sees «المواقع» (Sites)', () => {
    expect(itemEns).toContain(UNIFIED_ITEM_LABELS.sites.en);
  });

  it('sees «المشاريع» (Projects)', () => {
    expect(itemEns).toContain(UNIFIED_ITEM_LABELS.projects.en);
  });

  it('sees «طلباتي» (My Requests)', () => {
    expect(itemEns).toContain(UNIFIED_ITEM_LABELS.myRequests.en);
  });

  it('does NOT see «الفروع» (Branches)', () => {
    expect(itemEns).not.toContain(UNIFIED_ITEM_LABELS.branches.en);
  });

  it('does NOT see «بيانات المنشأة» (Business Profile)', () => {
    expect(itemEns).not.toContain(UNIFIED_ITEM_LABELS.businessProfile.en);
  });

  it('does NOT see «الفريق والصلاحيات» (Team)', () => {
    expect(itemEns).not.toContain(UNIFIED_ITEM_LABELS.team.en);
  });

  it('does NOT see «التحقق والظهور العام» (Visibility)', () => {
    expect(itemEns).not.toContain(UNIFIED_ITEM_LABELS.visibility.en);
  });

  it('does NOT render the «أعمال المنشأة» group', () => {
    expect(groupEns).not.toContain(UNIFIED_GROUP_LABELS.businessEntity.en);
  });

  it('CTA target /register-entity is wired (sidebar renders it as a card)', () => {
    expect(CREATE_ENTITY_ROUTE).toBe('/register-entity');
  });
});

describe('user with a business', () => {
  const groups = getVisibleDashboardNavGroups({
    audience: 'user', hasBusiness: true, isSuperAdmin: false,
  });
  const groupEns = groups.map((g) => g.groupLabel.en);
  const itemEns = labelsOf(groups);

  it('sees both «أعمال» and «أعمال المنشأة»', () => {
    expect(groupEns).toContain(UNIFIED_GROUP_LABELS.business.en);
    expect(groupEns).toContain(UNIFIED_GROUP_LABELS.businessEntity.en);
  });

  it('sees «الفروع» (Branches)', () => {
    expect(itemEns).toContain(UNIFIED_ITEM_LABELS.branches.en);
  });

  it('sees the full entity item set', () => {
    for (const key of ['businessProfile', 'services', 'portfolio', 'team', 'visibility'] as const) {
      expect(itemEns).toContain(UNIFIED_ITEM_LABELS[key].en);
    }
  });
});

describe('provider audience', () => {
  const groups = getVisibleDashboardNavGroups({
    audience: 'provider', hasBusiness: true, isSuperAdmin: false,
  });
  const groupEns = groups.map((g) => g.groupLabel.en);

  it('sees Provider-Requests group', () => {
    expect(groupEns).toContain(UNIFIED_GROUP_LABELS.providerOps.en);
  });
});

describe('admin audience', () => {
  const groups = getVisibleDashboardNavGroups({
    audience: 'admin', hasBusiness: true, isSuperAdmin: true,
  });
  const groupEns = groups.map((g) => g.groupLabel.en);

  it('uses «الجهات»-style registry groups, not the «أعمال» user grouping', () => {
    expect(groupEns).not.toContain(UNIFIED_GROUP_LABELS.business.en);
    expect(groupEns).not.toContain(UNIFIED_GROUP_LABELS.businessEntity.en);
    expect(groups.length).toBeGreaterThan(0);
  });
});