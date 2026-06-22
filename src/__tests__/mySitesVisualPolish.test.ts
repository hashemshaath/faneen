/**
 * MY SITES VISUAL POLISH + DISPLAY CONSISTENCY — static guards.
 *
 * Ensures the sites/workspace pages rely on the shared display-name
 * helpers and never reintroduce raw UUID titles or create-contract
 * RPC calls.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string): string =>
  readFileSync(resolve(process.cwd(), p), 'utf8');

const SITES = read('src/pages/dashboard/DashboardSites.tsx');
const SITE_DETAIL = read('src/pages/dashboard/DashboardSiteDetail.tsx');
const WORKSPACES = read('src/pages/dashboard/DashboardWorkspaces.tsx');
const WORKSPACE_DETAIL = read('src/pages/dashboard/DashboardWorkspaceDetail.tsx');
const SERVICE = read('src/services/clientWorkspaceService.ts');
const BREADCRUMBS = read('src/hooks/useBreadcrumbs.ts');

describe('My Sites visual polish + display consistency', () => {
  it('DashboardSites cards use the shared formatSiteTitle helper', () => {
    expect(SITES).toMatch(/formatSiteTitle/);
    expect(SITES).toMatch(/from '@\/lib\/workspace\/displayNames'/);
  });

  it('DashboardSites cards expose ownership + completion badges', () => {
    expect(SITES).toMatch(/Personal|شخصي/);
    expect(SITES).toMatch(/Business|منشأة/);
    expect(SITES).toMatch(/Complete|مكتمل/);
  });

  it('DashboardSiteDetail uses shared helpers (no raw .id title fallbacks)', () => {
    expect(SITE_DETAIL).toMatch(/formatSiteTitle|formatProjectTitle/);
    // No `|| c.id` / `|| p.id` / `|| l.id` / `|| r.id` raw fallbacks remain.
    expect(SITE_DETAIL).not.toMatch(/\|\|\s*c\.id\b/);
    expect(SITE_DETAIL).not.toMatch(/\|\|\s*p\.id\b/);
    expect(SITE_DETAIL).not.toMatch(/title:\s*l\.ref_id\s*\|\|\s*l\.id\b/);
    expect(SITE_DETAIL).not.toMatch(/title:\s*r\.ref_id\s*\|\|\s*r\.id\b/);
  });

  it('workspace service routes titles through display-name helpers', () => {
    expect(SERVICE).toMatch(/formatProjectTitle/);
    expect(SERVICE).toMatch(/formatSiteTitle/);
  });

  it('workspaces list still renders w.title (which the service guarantees is human)', () => {
    expect(WORKSPACES).toMatch(/\{w\.title\}/);
  });

  it('workspace detail page title goes through the service-formatted title', () => {
    expect(WORKSPACE_DETAIL).toMatch(/data\?\.workspace\.title/);
  });

  it('breadcrumbs mask UUID segments to a short #xxxxxxxx reference', () => {
    expect(BREADCRUMBS).toMatch(/`#\$\{seg\.slice\(0,\s*8\)\}`/);
    expect(BREADCRUMBS).toMatch(/sites:\s*\{ ar: 'المواقع'/);
    expect(BREADCRUMBS).toMatch(/workspaces:\s*\{ ar: 'مشاريعي ومواقعي'/);
  });

  it('site pages never invoke the create-contract-from-workspace RPC directly', () => {
    for (const src of [SITES, SITE_DETAIL, WORKSPACES, WORKSPACE_DETAIL]) {
      expect(src).not.toMatch(/create_contract_from_workspace_as_client/);
    }
  });

  it('site pages do not use service_role on the frontend', () => {
    for (const src of [SITES, SITE_DETAIL, WORKSPACES, WORKSPACE_DETAIL, SERVICE]) {
      expect(src.toLowerCase()).not.toContain('service_role');
    }
  });

  it('no new `any`/`as any`/ts-ignore suppressions on these surfaces', () => {
    for (const src of [SITES, SITE_DETAIL, WORKSPACES, WORKSPACE_DETAIL, SERVICE, BREADCRUMBS]) {
      expect(src).not.toMatch(/\bas any\b/);
      expect(src).not.toMatch(/@ts-ignore/);
    }
  });
});