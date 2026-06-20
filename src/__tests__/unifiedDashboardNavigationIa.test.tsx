import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  UNIFIED_GROUP_LABELS,
  UNIFIED_ITEM_LABELS,
  CREATE_ENTITY_ROUTE,
  COMPLETE_ENTITY_ROUTE,
} from '@/components/dashboard/navigation/unifiedLabels';

/**
 * UNIFIED DASHBOARD IA — static guards.
 *
 * Asserts the single-source-of-truth label registry stays internally
 * consistent, that the «Create entity» / «Complete onboarding» routes
 * are wired correctly in App.tsx, and that the user/provider sidebar
 * adopts the unified labels (no legacy «نشاطي» / «شركاتي» / «جهاتي»
 * synonyms on the user surface).
 */

const root = resolve(__dirname, '..', '..');
const APP = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');
const SIDEBAR = readFileSync(
  resolve(root, 'src/components/dashboard/DashboardSidebar.tsx'),
  'utf8',
);
const NAV_CONFIG = readFileSync(
  resolve(root, 'src/modules/dashboard/navigation/dashboardNavigation.config.ts'),
  'utf8',
);
const NAV_VISIBILITY = readFileSync(
  resolve(root, 'src/modules/dashboard/navigation/dashboardNavigation.visibility.ts'),
  'utf8',
);

describe('unified label registry', () => {
  it('exposes the five canonical group labels', () => {
    const keys = Object.keys(UNIFIED_GROUP_LABELS).sort();
    expect(keys).toEqual(['account', 'admin', 'business', 'dashboard', 'providerOps']);
  });

  it('has no duplicate Arabic group labels', () => {
    const ars = Object.values(UNIFIED_GROUP_LABELS).map((g) => g.ar);
    expect(new Set(ars).size).toBe(ars.length);
  });

  it('has no duplicate Arabic item labels', () => {
    const ars = Object.values(UNIFIED_ITEM_LABELS).map((i) => i.ar);
    expect(new Set(ars).size).toBe(ars.length);
  });
});

describe('entity creation routes', () => {
  it('/register-entity is registered in App.tsx (entity creation surface)', () => {
    expect(APP).toContain(`path="${CREATE_ENTITY_ROUTE}"`);
  });

  it('/onboarding is registered in App.tsx (entity completion only)', () => {
    expect(APP).toContain(`path="${COMPLETE_ENTITY_ROUTE}"`);
  });

  it('sidebar Create-business CTA points to /register-entity, never /onboarding', () => {
    // The CTA card always renders CREATE_ENTITY_ROUTE — verify the
    // constant is consumed and no inline `/onboarding` CTA leaked in.
    expect(SIDEBAR).toContain('CREATE_ENTITY_ROUTE');
    expect(SIDEBAR).not.toMatch(/to=["']\/onboarding["']/);
  });
});

describe('user sidebar adopts unified labels', () => {
  it('drops the legacy «نشاطي» group label', () => {
    expect(NAV_CONFIG).not.toMatch(/ar:\s*'نشاطي'/);
    expect(SIDEBAR).not.toMatch(/ar:\s*'نشاطي'/);
  });

  it('drops the legacy «الأعمال» / «شركاتي» / «جهاتي» synonyms on the user surface', () => {
    // We allow «الجهات» only inside the admin registry (separate file).
    for (const src of [SIDEBAR, NAV_CONFIG]) {
      expect(src).not.toMatch(/ar:\s*'شركاتي'/);
      expect(src).not.toMatch(/ar:\s*'جهاتي'/);
    }
  });

  it('imports the unified label registry', () => {
    // After the Phase C refactor, the sidebar imports labels via the
    // navigation module barrel; the config consumes the canonical
    // unifiedLabels file directly.
    expect(SIDEBAR).toContain("from '@/modules/dashboard/navigation'");
    expect(SIDEBAR).toContain('UNIFIED_GROUP_LABELS');
    expect(NAV_CONFIG).toContain('UNIFIED_ITEM_LABELS');
  });

  it('uses «المنشأة» as the user-facing business group label (not «الجهات»)', () => {
    expect(UNIFIED_GROUP_LABELS.business.ar).toBe('المنشأة');
  });
});

describe('sidebar visibility for users without a business', () => {
  it('gates the «المنشأة» group behind hasBusiness', () => {
    // The filter check moved into the visibility module.
    expect(SIDEBAR).toContain('hasBusiness');
    expect(NAV_VISIBILITY).toContain('hasBusiness');
    expect(NAV_VISIBILITY).toContain('UNIFIED_GROUP_LABELS.business.en');
  });
});