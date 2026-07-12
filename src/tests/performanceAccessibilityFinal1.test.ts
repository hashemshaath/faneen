/**
 * PERFORMANCE-ACCESSIBILITY-FINAL-1
 *
 * Static invariants for the launch-optimization pass.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

const APP = read('src/App.tsx');
// STALE-ASSERTION UPDATE: page-level lazyRetry declarations were moved out of
// App.tsx into src/routes/{publicRoutes,dashboardRoutes,adminRoutes}.ts to
// keep the App shell small. App.tsx now re-exports them via a barrel, so we
// verify the lazyRetry declarations against the route files instead.
const ROUTES = [
  read('src/routes/publicRoutes.ts'),
  read('src/routes/dashboardRoutes.ts'),
  read('src/routes/adminRoutes.ts'),
].join('\n');
const PICKER = read('src/components/brands/ApprovedBrandPicker.tsx');
const BOQ = read('src/components/workOrders/WorkOrderBoqSection.tsx');
const QUOTE = read('src/pages/Quote.tsx');

describe('PERFORMANCE-ACCESSIBILITY-FINAL-1', () => {
  it('major heavy pages registered via lazyRetry in route files', () => {
    const required = [
      'pages/Index',
      'pages/Search',
      'pages/Quote',
      'pages/BusinessProfile',
      'pages/Auth',
      'pages/dashboard/DashboardOverview',
      'pages/dashboard/ProductionBoardPage',
      'pages/dashboard/DashboardProcurement',
      'pages/dashboard/DashboardWorkOrders',
      // STALE-ASSERTION UPDATE: legacy DashboardContracts was consolidated
      // into the DashboardContractsHub route (nav-consolidation group 11).
      'pages/dashboard/DashboardContractsHub',
      'pages/admin/AdminBrands',
      // STALE-ASSERTION UPDATE: AdminProviderReview was consolidated into
      // AdminProviderReviewHub (tabbed hub) in admin UX reconsolidation.
      'pages/admin/AdminProviderReviewHub',
      'pages/admin/AdminHelpCenter',
    ];
    for (const p of required) {
      const re = new RegExp(`lazyRetry\\(\\(\\)\\s*=>\\s*import\\(["']\\.\\./${p}["']\\)\\)`);
      expect(ROUTES, `missing lazyRetry for ${p}`).toMatch(re);
    }
  });

  it('App.tsx has no eager page-level imports', () => {
    expect(APP).not.toMatch(/^import\s+\w+\s+from\s+["']\.\/pages\//m);
  });

  it('App.tsx wraps Routes in a Suspense boundary', () => {
    expect(APP).toMatch(/<Suspense\b[^>]*fallback=\{<PageLoader/);
  });

  it('DashboardOverview keeps Suspense + per-role lazyRetry views', () => {
    const src = read('src/pages/dashboard/DashboardOverview.tsx');
    expect(src).toMatch(/<Suspense\b[^>]*fallback=\{<DashboardViewSkeleton/);
    expect(src).toMatch(/lazyRetry\(\(\)\s*=>\s*import\(["']\.\/overview\/AdminDashboardView["']\)/);
    expect(src).toMatch(/lazyRetry\(\(\)\s*=>\s*import\(["']\.\/overview\/ProviderDashboardView["']\)/);
    expect(src).toMatch(/lazyRetry\(\(\)\s*=>\s*import\(["']\.\/overview\/UserDashboardView["']\)/);
  });

  it('public Quote page keeps SEO metadata helper', () => {
    expect(QUOTE).toMatch(/SEO|usePageMeta|Helmet|setMeta/);
  });

  it('ApprovedBrandPicker exposes a labelled group and labelled search input', () => {
    expect(PICKER).toMatch(/role=["']group["']/);
    expect(PICKER).toMatch(/aria-label=\{isRTL \?[^}]+:\s*'Approved brand selection'\s*\}/);
    expect(PICKER).toMatch(/aria-label=\{isRTL \?[^}]+:\s*'Search approved brands'\s*\}/);
  });

  it('ApprovedBrandPicker chip remove button has aria-label', () => {
    expect(PICKER).toMatch(/aria-label=\{isRTL \?[^}]+:\s*'Remove'\s*\}/);
  });

  it('Quote form brand section uses the ApprovedBrandPicker (multi)', () => {
    expect(QUOTE).toMatch(/ApprovedBrandPicker[\s\S]{0,400}mode=["']multi["']/);
  });

  it('BOQ section uses the ApprovedBrandPicker (single)', () => {
    expect(BOQ).toMatch(/ApprovedBrandPicker[\s\S]{0,200}mode=["']single["']/);
  });

  it('ApprovedBrandPicker does not introduce physical RTL classes', () => {
    const physical = PICKER.match(/className="[^"]*\b(ml-|mr-|pl-|pr-|left-|right-)\d/g);
    expect(physical, `physical RTL classes: ${physical?.join(', ')}`).toBeNull();
  });

  it('Quote.tsx does not import @supabase/supabase-js directly', () => {
    expect(QUOTE).not.toMatch(/from ["']@supabase\/supabase-js["']/);
  });

  it('decorative avatar images carry alt="" and aria-hidden', () => {
    const files = [
      'src/components/dashboard/entities/PermissionInspector.tsx',
      'src/components/dashboard/entities/TeamPermissionsOverview.tsx',
      'src/pages/admin/AdminBusinesses.tsx',
      'src/pages/dashboard/DashboardBusinessCompletion.tsx',
      'src/pages/dashboard/DashboardBusinessEdit.tsx',
      'src/pages/dashboard/DashboardEntityDetail.tsx',
    ];
    for (const f of files) {
      const src = read(f);
      const offenders = (src.match(/<img[^>]*alt=""[^>]*>/g) ?? []).filter(
        (tag) => !/aria-hidden/.test(tag),
      );
      expect(offenders, `decorative img without aria-hidden in ${f}`).toEqual([]);
    }
  });

  it('public Quote page does not link to /admin', () => {
    expect(QUOTE).not.toMatch(/to=["']\/admin/);
  });

  it('CWV: Search V3 keeps the initial bundle free of leaflet/recharts', () => {
    // Search V3 deliberately ships no map/chart libs in the initial path —
    // the prior lazy-loaded SearchMap is gone with the legacy rebuild.
    const page = read('src/pages/SearchV3.tsx');
    const results = read('src/components/search/v3/SearchResultsV3.tsx');
    for (const src of [page, results]) {
      expect(src).not.toMatch(/from\s+["']leaflet["']/);
      expect(src).not.toMatch(/from\s+["']react-leaflet["']/);
      expect(src).not.toMatch(/from\s+["']recharts["']/);
    }
  });

  it('CWV: HomeV2 still preloads hero LCP image', () => {
    const hero = read('src/components/home/v2/HomeV2.tsx');
    expect(hero).toMatch(/link\.rel\s*=\s*["']preload["']/);
    expect(hero).toMatch(/link\.as\s*=\s*["']image["']/);
  });
});
