import { describe, it, expect } from 'vitest';
import {
  providerNavGroups,
  userNavGroups,
  adminNavGroups,
  UNIFIED_ITEM_LABELS,
  UNIFIED_GROUP_LABELS,
} from '@/modules/dashboard/navigation';

const allGroups = [...userNavGroups, ...providerNavGroups, ...adminNavGroups];

describe('DASHBOARD NAV CONFIG — structural integrity', () => {
  it('every group exposes a unique key within its audience', () => {
    for (const audience of [userNavGroups, providerNavGroups, adminNavGroups]) {
      const keys = audience.map((g) => g.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('every item has a non-empty url, label.ar and label.en', () => {
    for (const g of allGroups) {
      for (const it of g.items) {
        expect(it.url).toMatch(/^\/(?!$)/);
        expect(it.label.ar.trim().length).toBeGreaterThan(0);
        expect(it.label.en.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('no audience contains duplicate urls', () => {
    for (const audience of [userNavGroups, providerNavGroups, adminNavGroups]) {
      const urls = audience.flatMap((g) => g.items.map((it) => it.url));
      expect(new Set(urls).size).toBe(urls.length);
    }
  });

  it('no audience contains the same label.en twice for different urls', () => {
    for (const audience of [userNavGroups, providerNavGroups]) {
      const seen = new Map<string, string>();
      for (const g of audience) {
        for (const it of g.items) {
          const prev = seen.get(it.label.en);
          if (prev && prev !== it.url) {
            throw new Error(`Duplicate label "${it.label.en}" -> ${prev} vs ${it.url}`);
          }
          seen.set(it.label.en, it.url);
        }
      }
    }
  });

  it('user + provider menus reuse the unified glossary for shared concepts', () => {
    const sharedConcepts: Array<keyof typeof UNIFIED_ITEM_LABELS> = [
      'overview', 'projects', 'sites', 'branches', 'messages', 'membership',
      'businessProfile', 'services', 'portfolio', 'team', 'visibility',
      'profile', 'notifications',
    ];
    const allLabels = [...userNavGroups, ...providerNavGroups]
      .flatMap((g) => g.items.map((it) => it.label));
    for (const key of sharedConcepts) {
      const canon = UNIFIED_ITEM_LABELS[key];
      const match = allLabels.find((l) => l.en === canon.en);
      expect(match, `missing canonical label "${canon.en}"`).toBeDefined();
    }
  });

  it('the five canonical group labels exist across the union', () => {
    const groupEns = new Set(allGroups.map((g) => g.groupLabel.en));
    for (const k of ['dashboard', 'business', 'providerOps', 'account'] as const) {
      expect(groupEns.has(UNIFIED_GROUP_LABELS[k].en)).toBe(true);
    }
  });
});