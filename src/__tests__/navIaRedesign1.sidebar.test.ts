import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * NAV-IA-REDESIGN-1: Dashboard/Admin sidebar IA cleanup guards.
 *  - every sidebar url maps to a route in App.tsx
 *  - no href="#"
 *  - /admin/ref/triage registered before /admin/ref/:refId
 *  - operations + work orders + ref triage entries present
 *  - admin/* hrefs in sidebar are admin-gated
 */

const root = resolve(__dirname, '..', '..');
const SIDEBAR = readFileSync(resolve(root, 'src/components/dashboard/DashboardSidebar.tsx'), 'utf8');
const APP = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');

const extractUrls = (block: string) => {
  const re = /url:\s*'([^']+)'/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) out.push(m[1]);
  return out;
};

describe('NAV-IA-REDESIGN-1 — sidebar/route consistency', () => {
  it('every sidebar url resolves to a registered route', () => {
    const urls = extractUrls(SIDEBAR).map((u) => u.split('?')[0]);
    const missing = urls.filter((u) => !APP.includes(`path="${u}"`));
    expect(missing, `missing routes: ${missing.join(', ')}`).toEqual([]);
  });

  it('no href="#" and no url: "#"', () => {
    expect(SIDEBAR).not.toMatch(/url:\s*'#'/);
    expect(SIDEBAR).not.toMatch(/href=["']#["']/);
  });

  it('/admin/ref/triage is registered before /admin/ref/:refId', () => {
    const t = APP.indexOf('path="/admin/ref/triage"');
    const d = APP.indexOf('path="/admin/ref/:refId"');
    expect(t).toBeGreaterThan(0);
    expect(d).toBeGreaterThan(0);
    expect(t).toBeLessThan(d);
  });

  it('every admin/* sidebar url is requireAdmin/requireSuperAdmin protected', () => {
    const urls = extractUrls(SIDEBAR)
      .map((u) => u.split('?')[0])
      .filter((u) => u.startsWith('/admin/'));
    const unprotected = urls.filter((h) => {
      const esc = h.replace(/[/\-:]/g, (c) => '\\' + c);
      const re = new RegExp(
        `path="${esc}"[^>]*requireAdmin|path="${esc}"[^>]*requireSuperAdmin`,
      );
      return !re.test(APP);
    });
    expect(unprotected, `unprotected: ${unprotected.join(', ')}`).toEqual([]);
  });
});

describe('NAV-IA-REDESIGN-1 — grouping & operations placement', () => {
  const providerBlock = (() => {
    const s = SIDEBAR.indexOf('const providerGroups');
    const e = SIDEBAR.indexOf('const userGroups');
    return SIDEBAR.slice(s, e);
  })();
  const adminBlock = (() => {
    const s = SIDEBAR.indexOf('const adminBaseGroups');
    const e = SIDEBAR.indexOf('// Render helpers', s);
    return SIDEBAR.slice(s, e);
  })();

  it('provider Overview group contains Dashboard, Analytics, Operations Feed', () => {
    // PROVIDER-IA-CONSOLIDATION: /dashboard/work-orders/overview now
    // redirects to /dashboard/work-orders and is no longer pinned to the
    // Overview group. Work Orders lives under "Operations". The Overview
    // group exposes the cross-domain Operations Feed as the entry point
    // to operational activity.
    const s = providerBlock.indexOf("en: 'Overview'");
    const e = providerBlock.indexOf('groupLabel', s + 1);
    const block = providerBlock.slice(s, e);
    expect(block).toContain("'/dashboard'");
    expect(block).toContain('/dashboard/analytics');
    expect(block).toContain('/dashboard/operations/feed');
  });

  it('provider Operations group contains Work Orders + Contracts', () => {
    const s = providerBlock.indexOf("en: 'Operations'");
    const e = providerBlock.indexOf('groupLabel', s + 1);
    const block = providerBlock.slice(s, e);
    expect(block).toContain("'/dashboard/work-orders'");
    expect(block).toContain("'/dashboard/contracts'");
  });

  it('provider Membership & Billing group is separate from Operations', () => {
    expect(providerBlock).toContain("en: 'Membership & Billing'");
    const s = providerBlock.indexOf("en: 'Membership & Billing'");
    const e = providerBlock.indexOf('groupLabel', s + 1);
    const block = providerBlock.slice(s, e);
    expect(block).not.toContain('/dashboard/work-orders');
    expect(block).not.toContain('/dashboard/contracts');
  });

  it('admin Overview group contains Operations Center + Bulk Reference Triage', () => {
    // ADMIN-IA-CONSOLIDATION: the standalone Operations Console sidebar
    // entry was merged into the unified Operations Center hub. The console
    // page is still reachable at /admin/operations/console (redirect to
    // /admin/operations?tab=console). Bulk Reference Triage remains a
    // top-level Overview shortcut.
    const s = adminBlock.indexOf("en: 'Overview'");
    const e = adminBlock.indexOf('groupLabel', s + 1);
    const block = adminBlock.slice(s, e);
    expect(block).toMatch(/url:\s*'\/admin\/operations'/);
    expect(block).toContain('/admin/ref/triage');
  });

  it('admin sidebar has no /admin/ref/:refId static link (entry is via triage/resolver)', () => {
    expect(adminBlock).not.toContain('/admin/ref/:');
  });
});