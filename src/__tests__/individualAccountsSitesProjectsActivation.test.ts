/**
 * INDIVIDUAL ACCOUNTS SITES + PROJECTS ACTIVATION — regression guard.
 *
 * Locks the activation invariants:
 *   - /dashboard/sites and /dashboard/projects are reachable by any
 *     authenticated user (no requireProvider, no business gate).
 *   - DashboardSites queries personal-owned sites via `client_user_id`
 *     and inserts personal sites with `client_user_id = user.id`.
 *   - DashboardProjects exposes "Add Project" whenever an ownerScope
 *     exists (business OR personal individual).
 *   - The site selector in projects only lists sites filtered by the
 *     current ownerScope (business_id for businesses, client_user_id
 *     for individuals) — no cross-tenant leakage.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.resolve(ROOT, p), 'utf8');

const APP      = read('src/App.tsx');
const PROJECTS = read('src/pages/dashboard/DashboardProjects.tsx');
const SITES    = read('src/pages/dashboard/DashboardSites.tsx');

describe('Individual accounts — sites + projects activation', () => {
  it('/dashboard/sites uses ProtectedRoute only (no requireProvider)', () => {
    const m = APP.match(/<Route\s+path="\/dashboard\/sites"\s+element=\{<ProtectedRoute([^>]*)>/);
    expect(m, 'sites route missing').not.toBeNull();
    expect(m![1] ?? '').not.toMatch(/requireProvider/);
  });

  it('/dashboard/projects uses ProtectedRoute only (no requireProvider)', () => {
    const m = APP.match(/<Route\s+path="\/dashboard\/projects"\s+element=\{<ProtectedRoute([^>]*)>/);
    expect(m, 'projects route missing').not.toBeNull();
    expect(m![1] ?? '').not.toMatch(/requireProvider/);
  });

  it('DashboardSites query filters personal sites by client_user_id', () => {
    expect(SITES).toMatch(/\.eq\('client_user_id',\s*user\.id\)/);
    expect(SITES).toMatch(/businessId\)\s*q = q\.eq\('business_id',\s*businessId\)/);
  });

  it('DashboardSites insert binds personal site to client_user_id when no business', () => {
    expect(SITES).toMatch(/client_user_id:\s*editing\?\.client_user_id\s*\?\?\s*\(businessId\s*\?\s*null\s*:\s*user\.id\)/);
  });

  it('DashboardProjects "Add Project" button is gated on ownerScope', () => {
    expect(PROJECTS).toMatch(/ownerScope\s*\?\s*\(\s*<Button[\s\S]*?(إضافة مشروع|Add Project)/);
    expect(PROJECTS).not.toMatch(/businessId\s*\?\s*\(\s*<Button[\s\S]*?(إضافة مشروع|Add Project)/);
  });

  it('DashboardProjects site selector scopes sites to the current owner only', () => {
    expect(PROJECTS).toMatch(/projects-owner-sites/);
    expect(PROJECTS).toMatch(/businessId\)\s*q = q\.eq\('business_id',\s*businessId\)/);
    expect(PROJECTS).toMatch(/q = q\.eq\('client_user_id',\s*user\.id\)/);
  });

  it('no fake-business creation in the activated pages', () => {
    for (const [name, src] of [['projects', PROJECTS], ['sites', SITES]] as const) {
      expect(src, `${name} must not auto-insert into businesses`).not.toMatch(/\.from\(['"]businesses['"]\)\.insert/);
    }
  });
});