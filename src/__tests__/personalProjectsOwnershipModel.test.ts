/**
 * PERSONAL PROJECTS OWNERSHIP MODEL — regression guard.
 *
 * Locks the Option A invariants for personal vs. business project
 * ownership so future edits cannot silently regress:
 *   - `/dashboard/projects` is reachable for any authenticated user
 *     (no `requireProvider`); individuals without a business can enter.
 *   - `DashboardProjects` queries by `owner_user_id` for personal
 *     scope and by `business_id` for business scope, and writes the
 *     correct ownership field on insert.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const APP = fs.readFileSync(path.resolve(ROOT, 'src/App.tsx'), 'utf8');
const PAGE = fs.readFileSync(
  path.resolve(ROOT, 'src/pages/dashboard/DashboardProjects.tsx'),
  'utf8',
);

describe('Personal projects ownership model', () => {
  it('/dashboard/projects does not use requireProvider', () => {
    const m = APP.match(/<Route\s+path="\/dashboard\/projects"[^>]*element=\{<ProtectedRoute([^>]*)>/);
    expect(m, 'route declaration missing').not.toBeNull();
    expect(m![1] ?? '').not.toMatch(/requireProvider/);
  });

  it('DashboardProjects derives an ownerScope (business or personal)', () => {
    expect(PAGE).toMatch(/ownerScope/);
    expect(PAGE).toMatch(/mode:\s*'business'/);
    expect(PAGE).toMatch(/mode:\s*'personal'/);
  });

  it('personal-scope query filters by owner_user_id', () => {
    expect(PAGE).toMatch(/\.eq\('owner_user_id',\s*ownerScope\.userId\)/);
  });

  it('business-scope query still filters by business_id', () => {
    expect(PAGE).toMatch(/\.eq\('business_id',\s*ownerScope\.businessId\)/);
  });

  it('insert payload writes the correct ownership field (XOR)', () => {
    expect(PAGE).toMatch(/business_id:\s*ownerScope\.mode\s*===\s*'business'\s*\?\s*ownerScope\.businessId\s*:\s*null/);
    expect(PAGE).toMatch(/owner_user_id:\s*ownerScope\.mode\s*===\s*'personal'\s*\?\s*ownerScope\.userId\s*:\s*null/);
  });

  it('no service_role / migrations references on the client page', () => {
    for (const forbidden of ['service_role', 'supabase/migrations', '@ts-ignore', '@ts-expect-error', 'eslint-disable']) {
      expect(PAGE.includes(forbidden), `${forbidden} present in DashboardProjects`).toBe(false);
    }
  });
});