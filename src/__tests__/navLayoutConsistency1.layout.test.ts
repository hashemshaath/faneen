import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * NAV-LAYOUT-CONSISTENCY-1 guards.
 *
 * Ensures admin and dashboard pages render inside DashboardLayout
 * (which provides the sidebar + mobile trigger), and that the Admin
 * Operations Console exposes the Provider Operations Shortcuts card.
 */
const root = resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

const PAGES_REQUIRING_LAYOUT: string[] = [
  'src/pages/admin/AdminCronRuns.tsx',
  'src/pages/admin/AdminOperations.tsx',
  'src/pages/admin/AdminOperationsConsole.tsx',
  'src/pages/admin/AdminReferenceInspector.tsx',
  'src/pages/admin/AdminBulkReferenceTriage.tsx',
  'src/pages/admin/AdminMembershipEvents.tsx',
  'src/pages/admin/AdminMembershipPayments.tsx',
  'src/pages/admin/AdminPdfVisualQa.tsx',
  'src/pages/dashboard/DashboardWorkOrders.tsx',
  'src/pages/dashboard/DashboardWorkOrderDetail.tsx',
];

describe('NAV-LAYOUT-CONSISTENCY-1 — pages wrapped in DashboardLayout', () => {
  for (const p of PAGES_REQUIRING_LAYOUT) {
    it(`${p} imports and renders <DashboardLayout>`, () => {
      const src = read(p);
      expect(src, `${p} missing DashboardLayout import`).toMatch(
        /from ['"]@\/components\/dashboard\/DashboardLayout['"]/,
      );
      expect(src, `${p} missing <DashboardLayout> usage`).toMatch(/<DashboardLayout/);
    });
  }
});

describe('NAV-LAYOUT-CONSISTENCY-1 — route guards preserved', () => {
  const APP = read('src/App.tsx');
  const ADMIN_ROUTES = [
    '/admin/cron-runs',
    '/admin/operations',
    '/admin/operations/console',
    '/admin/ref/triage',
    '/admin/ref/:refId',
    '/admin/membership-events',
    '/admin/membership-payments',
    '/admin/pdf-visual-qa',
  ];
  for (const r of ADMIN_ROUTES) {
    it(`${r} still guarded by requireAdmin`, () => {
      const re = new RegExp(
        `path="${r.replace(/[/\-:]/g, (c) => '\\' + c)}"[^>]*requireAdmin`,
      );
      expect(APP).toMatch(re);
    });
  }
});

describe('NAV-LAYOUT-CONSISTENCY-1 — Provider Operations Shortcuts card', () => {
  const src = read('src/pages/admin/AdminOperationsConsole.tsx');
  it('renders the shortcuts card', () => {
    expect(src).toMatch(/provider-operations-shortcuts/);
    expect(src).toMatch(/Provider Operations Shortcuts/);
    expect(src).toMatch(/اختصارات عمليات المزود/);
  });
  it('links to the three provider operations pages', () => {
    expect(src).toMatch(/to="\/dashboard\/work-orders"/);
    expect(src).toMatch(/to="\/dashboard\/work-orders\/overview"/);
    expect(src).toMatch(/to="\/dashboard\/operations\/feed"/);
  });
  it('includes the workspace-scope helper text', () => {
    expect(src).toMatch(/provider-scoped and depend on the active workspace|تعتمد على مساحة العمل النشطة/);
  });
  it('has no dead href="#" links', () => {
    expect(src).not.toMatch(/href="#"/);
  });
});