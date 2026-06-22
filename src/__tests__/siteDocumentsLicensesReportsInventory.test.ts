/**
 * SITE DOCUMENTS + LICENSES + REPORTS INVENTORY — source-level guards.
 *
 * Locks in the Files tab inventory pass:
 *   - Files tab is wired to <SiteFilesTab/> (no inline Coming-Soon stub).
 *   - SiteFilesTab is strictly read-only: no input[type=file], no
 *     useMutation, no storage write, no upload endpoint.
 *   - Files come from contract_attachments + project_images only, both
 *     scoped by IN(...) on already-loaded ids (no N+1, no service_role).
 *   - Licenses tab stays a Coming Soon (no fake data).
 *   - Reports tab still renders SiteReportsTab (real site_reports).
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
  it('renders <SiteFilesTab/> with contractIds + projectIds', () => {
    expect(DETAIL).toMatch(/<SiteFilesTab[\s\S]*contractIds=\{contracts\.map\(\(c\)\s*=>\s*c\.id\)\}[\s\S]*projectIds=\{projects\.map\(\(p\)\s*=>\s*p\.id\)\}/);
  });
  it('does not keep the legacy inline "coming next phase" Files stub', () => {
    expect(DETAIL).not.toMatch(/Site files management is coming in the next phase/);
  });
});

describe('SiteFilesTab — read-only & inventory rules', () => {
  it('reads contract_attachments and project_images only', () => {
    expect(FILES).toMatch(/\.from\('contract_attachments'\)/);
    expect(FILES).toMatch(/\.from\('project_images'\)/);
  });
  it('uses batched IN queries (no N+1)', () => {
    expect(FILES).toMatch(/\.in\('contract_id',\s*contractIds\)/);
    expect(FILES).toMatch(/\.in\('project_id',\s*projectIds\)/);
  });
  it('queries are gated by id arrays (no fan-out when empty)', () => {
    expect(FILES).toMatch(/enabled:\s*contractIds\.length\s*>\s*0/);
    expect(FILES).toMatch(/enabled:\s*projectIds\.length\s*>\s*0/);
  });
  it('renders an empty state when no files are linked', () => {
    expect(FILES).toMatch(/data-testid="site-files-empty"/);
    expect(FILES).toMatch(/لا توجد ملفات مرتبطة بهذا الموقع حتى الآن/);
    expect(FILES).toMatch(/سيتم تفعيل رفع وإدارة ملفات المواقع/);
  });
  it('exposes no file-upload surface', () => {
    expect(FILES).not.toMatch(/<input[^>]*type=["']file["']/);
    expect(FILES).not.toMatch(/useMutation/);
    expect(FILES).not.toMatch(/\.upload\(/);
    expect(FILES).not.toMatch(/\.from\(['"]storage['"]\)/);
    expect(FILES).not.toMatch(/storage\.from\(/);
  });
  it('contains no service_role / hex / any / suppressions', () => {
    expect(FILES).not.toMatch(/service_role/i);
    expect(FILES).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
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