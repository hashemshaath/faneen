import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ADMIN_NAV_GROUPS } from '@/modules/admin-shell';

/**
 * ADMIN-REDESIGN PHASE 3 guards (replaces ADMIN-SIDEBAR-UX-RESTRUCTURE-2).
 *
 * The admin sidebar is now derived from a central navigation registry
 * (`@/modules/admin-shell`). These tests enforce the Phase 3 structure
 * by inspecting the registry directly plus a small set of source-text
 * assertions on the sidebar/App files.
 *
 *  - exactly 7 canonical admin groups
 *  - bilingual labels on every group and item
 *  - no duplicate routes anywhere in the registry
 *  - every registered route resolves to a <Route> in App.tsx
 *  - every /admin/* route has requireAdmin / requireSuperAdmin protection
 *  - /admin/system/identity is registered exactly once (Identity Center)
 *  - no href="#" anywhere in the sidebar
 *  - no /dashboard/membership link anywhere in the sidebar
 */

const root = resolve(__dirname, '..', '..');
const SIDEBAR = readFileSync(resolve(root, 'src/components/dashboard/DashboardSidebar.tsx'), 'utf8');
const APP = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');

const APPROVED_GROUP_IDS = [
  'overview',
  'operations',
  'users-entities',
  'content-directory',
  'system-governance',
  'analytics',
  'finance',
] as const;

describe('admin nav registry — canonical 7 groups', () => {
  it('exposes exactly 7 admin groups in the documented order', () => {
    const ids = ADMIN_NAV_GROUPS.map((g) => g.id);
    expect(ids).toEqual(APPROVED_GROUP_IDS);
  });

  for (const id of APPROVED_GROUP_IDS) {
    it(`group "${id}" has bilingual labels`, () => {
      const g = ADMIN_NAV_GROUPS.find((x) => x.id === id);
      expect(g).toBeDefined();
      expect(g!.labelAr.length).toBeGreaterThan(0);
      expect(g!.labelEn.length).toBeGreaterThan(0);
    });
  }
});

describe('admin nav registry — items', () => {
  const items = ADMIN_NAV_GROUPS.flatMap((g) => g.items);

  it('every item has bilingual labels and a non-empty route', () => {
    for (const it of items) {
      expect(it.labelAr.length, `${it.id} labelAr`).toBeGreaterThan(0);
      expect(it.labelEn.length, `${it.id} labelEn`).toBeGreaterThan(0);
      expect(it.route.startsWith('/'), `${it.id} route`).toBe(true);
    }
  });

  it('routes are unique across the entire registry', () => {
    const seen = new Map<string, number>();
    for (const it of items) seen.set(it.route, (seen.get(it.route) ?? 0) + 1);
    const dups = [...seen.entries()].filter(([, n]) => n > 1).map(([r]) => r);
    expect(dups, `duplicate routes: ${dups.join(', ')}`).toEqual([]);
  });

  it('Identity Center route appears exactly once', () => {
    const n = items.filter((it) => it.route === '/admin/system/identity').length;
    expect(n).toBe(1);
  });
});

describe('admin nav registry — routing integrity', () => {
  const items = ADMIN_NAV_GROUPS.flatMap((g) => g.items);

  it('every registry route resolves to a registered admin route', () => {
    const missing = items
      .map((it) => it.route)
      .filter((r) => !APP.includes(`path="${r}"`));
    expect(missing, `missing routes: ${missing.join(', ')}`).toEqual([]);
  });

  it('every /admin/* route is requireAdmin or requireSuperAdmin protected', () => {
    // The bare `/admin` landing is mounted as a wrapper that itself
    // enforces admin protection on render — skip the prefix-less route.
    const unprotected = items.filter((it) => {
      if (!it.route.startsWith('/admin/')) return false;
      const esc = it.route.replace(/[/\-:]/g, (c) => '\\' + c);
      const re = new RegExp(
        `path="${esc}"[^>]*requireAdmin|path="${esc}"[^>]*requireSuperAdmin`,
      );
      return !re.test(APP);
    });
    expect(
      unprotected.map((it) => it.route),
      `unprotected: ${unprotected.map((it) => it.route).join(', ')}`,
    ).toEqual([]);
  });
});

describe('admin sidebar — legacy guard rails', () => {
  it('no href="#" anywhere in the sidebar file', () => {
    expect(SIDEBAR).not.toMatch(/url:\s*'#'/);
    expect(SIDEBAR).not.toMatch(/href=["']#["']/);
  });

  it('no /dashboard/membership link anywhere in sidebar', () => {
    expect(SIDEBAR).not.toMatch(/\/dashboard\/membership(?![-/])/);
  });
});

// Legacy placeholders kept for grep compatibility — registry-driven assertions
// above supersede the original ADMIN_BLOCK string scans.
const _LEGACY_GROUP_LABELS_REFERENCED = [
  'مراجعة المزودين',
  'إدارة الوصول',
];
