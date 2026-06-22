/**
 * SITE DOCUMENTS + LICENSES + REPORTS INVENTORY — source-level guards.
 *
 * After the upload model pass:
 *   - Files tab is wired to <SiteFilesTab/>.
 *   - SiteFilesTab now hosts an "own files" section (client_site_files)
 *     with an inline upload form, AND a separate read-only "linked files"
 *     section (contract_attachments + project_images).
 *   - Direct storage / table calls for site files happen only through the
 *     siteFilesService — no service_role in frontend.
 *   - Licenses tab stays a Coming Soon (no fake data).
 *   - Reports tab still renders SiteReportsTab.
 *   - Contracts → execution_site_id; Projects → site_id (unchanged).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DETAIL = readFileSync(resolve('src/pages/dashboard/DashboardSiteDetail.tsx'), 'utf8');
const FILES  = readFileSync(resolve('src/components/sites/SiteFilesTab.tsx'), 'utf8');

describe('DashboardSiteDetail — Files tab wiring', () => {
  it('imports the SiteFilesTab component', () => {
    expect(DETAIL).toMatch(/import\s+SiteFilesTab\s+from\s+'@\/components\/sites\/SiteFilesTab'/);
  });
  it('renders <SiteFilesTab/> with siteId, canManage, contractIds, projectIds', () => {
    expect(DETAIL).toMatch(/<SiteFilesTab[\s\S]*siteId=\{site\.id\}[\s\S]*canManage=\{canManage\}[\s\S]*contractIds=\{contracts\.map\(\(c\)\s*=>\s*c\.id\)\}[\s\S]*projectIds=\{projects\.map\(\(p\)\s*=>\s*p\.id\)\}/);
  });
  it('does not keep the legacy inline "coming next phase" Files stub', () => {
    expect(DETAIL).not.toMatch(/Site files management is coming in the next phase/);
  });
});

describe('SiteFilesTab — split sections (own + linked)', () => {
  it('reads contract_attachments and project_images for linked section', () => {
    expect(FILES).toMatch(/\.from\('contract_attachments'\)/);
    expect(FILES).toMatch(/\.from\('project_images'\)/);
  });
  it('uses batched IN queries (no N+1) for linked files', () => {
    expect(FILES).toMatch(/\.in\('contract_id',\s*contractIds\)/);
    expect(FILES).toMatch(/\.in\('project_id',\s*projectIds\)/);
  });
  it('queries are gated by id arrays (no fan-out when empty)', () => {
    expect(FILES).toMatch(/enabled:\s*contractIds\.length\s*>\s*0/);
    expect(FILES).toMatch(/enabled:\s*projectIds\.length\s*>\s*0/);
  });
  it('renders own-files + linked-files sections distinctly', () => {
    expect(FILES).toMatch(/data-testid="site-files-own-section"/);
    expect(FILES).toMatch(/data-testid="site-files-linked-section"/);
  });
  it('linked section stays read-only (no upload UI inside it)', () => {
    const linked = FILES.split('site-files-linked-section')[1] ?? '';
    expect(linked).not.toMatch(/<input[^>]*type=["']file["']/);
    expect(linked).not.toMatch(/uploadSiteFile/);
  });
  it('all site-file storage/table writes go through siteFilesService', () => {
    expect(FILES).toMatch(/from\s+'@\/services\/siteFilesService'/);
    // No direct storage call against the site-files bucket from the component
    expect(FILES).not.toMatch(/storage\.from\(['"]site-files['"]\)/);
    // No direct table mutation against client_site_files from the component
    expect(FILES).not.toMatch(/\.from\(['"]client_site_files['"]\)/);
  });
  it('contains no service_role / any / suppressions', () => {
    expect(FILES).not.toMatch(/service_role/i);
    expect(FILES).not.toMatch(/:\s*any\b/);
    expect(FILES).not.toMatch(/\bas\s+any\b/);
    expect(FILES).not.toMatch(/@ts-ignore/);
    expect(FILES).not.toMatch(/eslint-disable/);
  });
});

describe('Licenses + Reports tabs invariants', () => {
  it('Licenses tab stays a Coming-Soon (no fake licenses data)', () => {
    expect(DETAIL).toMatch(/data-testid="site-licenses-tab"/);
    expect(DETAIL).toMatch(/الرخص والتصاريح والمخالفات — قريباً|coming soon/i);
    expect(DETAIL).not.toMatch(/from\(['"]site_licenses['"]\)/);
  });
  it('Reports tab still renders SiteReportsTab (real site_reports)', () => {
    expect(DETAIL).toMatch(/<SiteReportsTab\s+siteId=\{site\.id\}/);
  });
});

describe('Contracts/Projects link integrity (unchanged)', () => {
  it('contracts query uses execution_site_id', () => {
    expect(DETAIL).toMatch(/\.from\('contracts'\)[\s\S]*\.eq\('execution_site_id',\s*id\)/);
  });
  it('projects query uses site_id', () => {
    expect(DETAIL).toMatch(/\.from\('projects'\)[\s\S]*\.eq\('site_id',\s*id\)/);
  });
  it('no create_contract RPC is invoked from the detail page', () => {
    expect(DETAIL).not.toMatch(/create_contract_from_workspace_as_client/);
    expect(DETAIL).not.toMatch(/create_contract_from_template/);
  });
});