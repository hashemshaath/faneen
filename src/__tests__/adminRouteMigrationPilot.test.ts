/**
 * DEFERRED CLEANUP L17/L18 — admin route migration pilot guard.
 *
 * Scope: route wiring + page shell only. No DB / RLS / RPC / migrations /
 * edge functions / business logic / queries / services were touched.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const APP = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');
const PAGE = readFileSync(
  resolve(__dirname, '../pages/admin/AdminTaxonomyCenter.tsx'),
  'utf8',
);
const ADMIN_ROUTE = readFileSync(
  resolve(__dirname, '../components/auth/AdminRoute.tsx'),
  'utf8',
);

describe('Admin route migration pilot — AdminTaxonomyCenter', () => {
  it('AdminRoute composes ProtectedRoute requireAdmin + DashboardLayout', () => {
    expect(ADMIN_ROUTE).toMatch(/ProtectedRoute\s+requireAdmin/);
    expect(ADMIN_ROUTE).toMatch(/DashboardLayout/);
  });

  it('AdminTaxonomyCenter page no longer imports DashboardLayout', () => {
    expect(PAGE).not.toMatch(
      /from\s+['"]@\/components\/dashboard\/DashboardLayout['"]/,
    );
  });

  it('AdminTaxonomyCenter still renders the TaxonomyAdminPage content', () => {
    expect(PAGE).toMatch(/TaxonomyAdminPage/);
    expect(existsSync(resolve(__dirname, '../pages/admin/AdminTaxonomyCenter.tsx'))).toBe(true);
  });

  it('/admin/taxonomy route still exists at the same URL', () => {
    expect(APP).toMatch(/path="\/admin\/taxonomy"/);
  });

  it('/admin/taxonomy is wrapped in <AdminRoute> (admin-only access preserved)', () => {
    expect(APP).toMatch(
      /path="\/admin\/taxonomy"\s+element=\{<AdminRoute><AdminTaxonomyCenter \/><\/AdminRoute>\}/,
    );
  });

  it('App.tsx imports the shared AdminRoute wrapper', () => {
    expect(APP).toMatch(/from\s+["']@\/components\/auth\/AdminRoute["']/);
  });

  it('mass migration was NOT performed — pilot scope is exactly one route', () => {
    const adminRouteRouteElements =
      (APP.match(/element=\{<AdminRoute>/g) ?? []).length;
    expect(adminRouteRouteElements).toBe(1);
  });
});