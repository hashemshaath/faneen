/**
 * MY SITES DETAIL + FILES READ-ONLY — source-level assertions on
 * `src/pages/dashboard/DashboardSiteDetail.tsx` to lock in the new
 * read-only surface (linked projects + files coming-soon + licenses
 * coming-soon) and the safety rails the product brief requires.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DETAIL_PATH = resolve(__dirname, '../pages/dashboard/DashboardSiteDetail.tsx');
const LIST_PATH   = resolve(__dirname, '../pages/dashboard/DashboardSites.tsx');
const APP_PATH    = resolve(__dirname, '../App.tsx');

const DETAIL = readFileSync(DETAIL_PATH, 'utf8');
const LIST   = readFileSync(LIST_PATH, 'utf8');
const APP    = readFileSync(APP_PATH, 'utf8');

describe('DashboardSiteDetail — read-only pass', () => {
  it('«إدارة الموقع» CTA navigates to /dashboard/sites/:id', () => {
    expect(LIST).toContain('إدارة الموقع');
    expect(LIST).toMatch(/navigate\(`\/dashboard\/sites\/\$\{s\.id\}`\)/);
    expect(APP).toMatch(/path="\/dashboard\/sites\/:id"/);
  });

  it('renders site identity fields (label, city, address, type)', () => {
    // Display title is now built via the shared `formatSiteTitle` helper
    // (which internally reads site.site_name → site.label → city). The
    // raw `label` column is still queried and used elsewhere.
    expect(DETAIL).toMatch(/formatSiteTitle\(\s*site\s*,\s*isRTL\s*\)/);
    expect(DETAIL).toContain('site.city_name');
    expect(DETAIL).toContain('site.address_line1');
    expect(DETAIL).toContain('site.site_type');
  });

  it('reads linked projects from projects.site_id', () => {
    expect(DETAIL).toMatch(/\.from\(\s*'projects'\s*\)/);
    expect(DETAIL).toMatch(/\.eq\('site_id',\s*id\)/);
    expect(DETAIL).toContain('data-testid="site-projects-tab"');
  });

  it('reads linked contracts from contracts.execution_site_id', () => {
    expect(DETAIL).toMatch(/\.from\(\s*'contracts'\s*\)/);
    expect(DETAIL).toMatch(/\.eq\('execution_site_id',\s*id\)/);
  });

  it('files tab renders SiteFilesTab and wires upload eligibility via canManage', () => {
    expect(DETAIL).toContain('data-testid="site-files-tab"');
    expect(DETAIL).toMatch(/<SiteFilesTab\b/);
    // The page itself does not call storage directly — upload goes through
    // the service layer inside SiteFilesTab.
    const filesBlock = DETAIL.split('data-testid="site-files-tab"')[1]?.split('</TabsContent>')[0] ?? '';
    expect(filesBlock).not.toMatch(/storage\.from\(/);
    expect(filesBlock).toMatch(/canManage=\{canManage\}/);
    expect(filesBlock).toMatch(/siteId=\{site\.id\}/);
  });

  it('licenses tab is coming soon only', () => {
    expect(DETAIL).toContain('data-testid="site-licenses-tab"');
    expect(DETAIL).toMatch(/قريباً|coming soon/i);
  });

  it('does NOT call create-contract RPC from the detail page', () => {
    expect(DETAIL).not.toContain('create_contract_from_workspace_as_client');
    expect(DETAIL).not.toContain('create_contract_from_workspace');
  });

  it('does NOT use service_role on the frontend', () => {
    expect(DETAIL).not.toMatch(/service_role/i);
  });

  it('introduces no new `any` / `as any` / suppressions', () => {
    // The file pre-existed; assert no NEW suppressions were added in this pass.
    expect(DETAIL).not.toMatch(/@ts-ignore/);
    expect(DETAIL).not.toMatch(/@ts-nocheck/);
    // existing `as unknown as SiteRow` cast is the only allowed cast.
    const offendingAny = DETAIL.match(/\bas\s+any\b/g) ?? [];
    expect(offendingAny).toHaveLength(0);
  });

  it('uses no hardcoded hex colors in the added tabs', () => {
    const newTabs = ['site-projects-tab', 'site-files-tab', 'site-licenses-tab']
      .map((t) => DETAIL.split(`data-testid="${t}"`)[1]?.split('</TabsContent>')[0] ?? '')
      .join('\n');
    expect(newTabs).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});