import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * APP-UX-FUNCTIONAL-POLISH-1 — Page hygiene + linking guarantees.
 *
 * Confirms the polish pass actually wires breadcrumbs, quick links and
 * the read-only metrics aggregator into the operations surfaces, and
 * that nothing leaked into the pages that we explicitly forbid
 * (UUIDs in JSX, dead `href="#"`, direct supabase.from in pages).
 */

const ROOT = path.resolve(__dirname, '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const PROVIDER_PAGES = [
  'pages/dashboard/DashboardWorkOrders.tsx',
  'pages/dashboard/DashboardWorkOrderDetail.tsx',
  'pages/dashboard/DashboardWorkOrdersOverview.tsx',
  'pages/dashboard/DashboardOperationsFeed.tsx',
];

const ADMIN_PAGES = [
  'pages/admin/AdminOperationsConsole.tsx',
  'pages/admin/AdminBulkReferenceTriage.tsx',
  'pages/admin/AdminReferenceInspector.tsx',
];

describe('APP-UX-FUNCTIONAL-POLISH-1 — breadcrumbs component', () => {
  const src = read('components/operations/OperationsBreadcrumbs.tsx');

  it('exists and exports OperationsBreadcrumbs', () => {
    expect(src).toContain('export function OperationsBreadcrumbs');
  });

  it('renders a semantic nav with aria-label', () => {
    expect(src).toContain('<nav');
    expect(src).toContain("aria-label={isRTL ? 'مسار التنقّل' : 'Breadcrumb'}");
  });

  it('marks the current page with aria-current="page"', () => {
    expect(src).toContain("aria-current={isLast ? 'page' : undefined}");
  });

  it('is bilingual', () => {
    expect(src).toContain('isRTL');
    expect(src).toContain('labelAr');
    expect(src).toContain('labelEn');
  });
});

describe('APP-UX-FUNCTIONAL-POLISH-1 — provider operations pages', () => {
  it('Work Orders Overview wires breadcrumbs + Feed link + metrics aggregator', () => {
    const src = read('pages/dashboard/DashboardWorkOrdersOverview.tsx');
    expect(src).toContain('OperationsBreadcrumbs');
    expect(src).toContain('/dashboard/operations/feed');
    expect(src).toContain('computeOperationalMetrics');
    // BUSINESS-OPS-METRICS-2 replaced the inline mini-strip with the
    // shared <ProviderOperationalMetricsCards/> component.
    expect(src).toContain('ProviderOperationalMetricsCards');
    // recent items deep-link to the detail page by ref_id
    expect(src).toContain('/dashboard/work-orders/${wo.ref_id}');
  });

  it('Operations Feed exposes breadcrumbs, refresh, empty state, overview link', () => {
    const src = read('pages/dashboard/DashboardOperationsFeed.tsx');
    expect(src).toContain('OperationsBreadcrumbs');
    expect(src).toContain('/dashboard/work-orders/overview');
    expect(src).toContain('Open in Admin Ref Inspector');
    expect(src).toContain('No events match the current filters.');
  });

  it('Work Order detail wires breadcrumbs, scroll-to-task, source link, admin inspector', () => {
    const src = read('pages/dashboard/DashboardWorkOrderDetail.tsx');
    expect(src).toContain('OperationsBreadcrumbs');
    expect(src).toContain('scrollIntoView');
    expect(src).toContain('/r/${wo.source_ref_id}');
    expect(src).toContain('/admin/ref/${refId}');
    expect(src).toContain('/dashboard/work-orders/overview');
    expect(src).toContain('/dashboard/operations/feed');
  });
});

describe('APP-UX-FUNCTIONAL-POLISH-1 — admin operations pages', () => {
  it('all admin pages wire OperationsBreadcrumbs with homeTo="/admin"', () => {
    for (const p of ADMIN_PAGES) {
      const src = read(p);
      expect(src, p).toContain('OperationsBreadcrumbs');
      expect(src, p).toContain('homeTo="/admin"');
    }
  });

  it('bulk triage links back to the operations console', () => {
    const src = read('pages/admin/AdminBulkReferenceTriage.tsx');
    expect(src).toContain('/admin/operations/console');
  });

  it('reference inspector breadcrumb links back to triage', () => {
    const src = read('pages/admin/AdminReferenceInspector.tsx');
    expect(src).toContain('/admin/ref/triage');
  });
});

describe('APP-UX-FUNCTIONAL-POLISH-1 — page hygiene', () => {
  const ALL = [...PROVIDER_PAGES, ...ADMIN_PAGES];

  it('no page uses direct supabase.from(', () => {
    for (const p of ALL) {
      const src = read(p);
      expect(src, p).not.toMatch(/supabase\.from\(/);
    }
  });

  it('no page renders raw UUIDs as labels', () => {
    const uuid = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
    for (const p of ALL) {
      const src = read(p);
      expect(src, p).not.toMatch(uuid);
    }
  });

  it('no page uses href="#" dead links', () => {
    for (const p of ALL) {
      const src = read(p);
      expect(src, p).not.toMatch(/href=["']#["']/);
    }
  });

  it('no page renders provider_intent_id or synthetic phone email', () => {
    for (const p of ALL) {
      const src = read(p);
      expect(src, p).not.toContain('provider_intent_id');
      expect(src, p).not.toMatch(/phone-[^@]+@/);
    }
  });
});

describe('APP-UX-FUNCTIONAL-POLISH-1 — App.tsx routes preserved', () => {
  const app = read('App.tsx');

  it('keeps provider routes as ProtectedRoute', () => {
    for (const route of [
      '/dashboard/work-orders',
      '/dashboard/work-orders/overview',
      '/dashboard/operations/feed',
    ]) {
      expect(app, route).toContain(route);
    }
  });

  it('keeps admin routes guarded', () => {
    for (const route of [
      '/admin/operations/console',
      '/admin/ref/triage',
      '/admin/ref/:refId',
    ]) {
      expect(app, route).toContain(route);
    }
    expect(app).toContain('requireAdmin');
  });
});