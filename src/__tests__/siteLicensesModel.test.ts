/**
 * SITE LICENSES + PERMITS MODEL — source-level guards.
 *
 * Locks the read/write model:
 *   - DB migration creates `client_site_licenses` with RLS + the three
 *     named policies, no DELETE policy, owner/site immutability +
 *     cross-site file_id coherence triggers.
 *   - Service layer is the single entry point for the table.
 *   - UI tab renders inline (no Dialog), picks files from existing
 *     site files (no upload input here), exposes archive (no hard delete),
 *     and surfaces an expiring-soon hint.
 *   - No service_role / any / suppressions in the new files.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const SERVICE = readFileSync(resolve('src/services/siteLicensesService.ts'), 'utf8');
const TAB     = readFileSync(resolve('src/components/sites/SiteLicensesTab.tsx'), 'utf8');
const DETAIL  = readFileSync(resolve('src/pages/dashboard/DashboardSiteDetail.tsx'), 'utf8');

const migrationBlobs = (): string[] => {
  const dir = resolve('supabase/migrations');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => readFileSync(resolve(dir, f), 'utf8'));
};

describe('DB migration — client_site_licenses', () => {
  const blobs = migrationBlobs();
  const mig = blobs.find((b) => /CREATE\s+TABLE\s+public\.client_site_licenses/i.test(b));

  it('creates the table', () => {
    expect(mig).toBeTruthy();
  });
  it('grants to authenticated + service_role and revokes anon + delete', () => {
    expect(mig!).toMatch(/GRANT\s+SELECT,\s*INSERT,\s*UPDATE\s+ON\s+public\.client_site_licenses\s+TO\s+authenticated/i);
    expect(mig!).toMatch(/GRANT\s+ALL\s+ON\s+public\.client_site_licenses\s+TO\s+service_role/i);
    expect(mig!).toMatch(/REVOKE\s+DELETE\s+ON\s+public\.client_site_licenses\s+FROM\s+authenticated/i);
    expect(mig!).toMatch(/REVOKE\s+ALL\s+ON\s+public\.client_site_licenses\s+FROM\s+anon/i);
  });
  it('enables RLS and ships the three named policies', () => {
    expect(mig!).toMatch(/ALTER\s+TABLE\s+public\.client_site_licenses\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(mig!).toMatch(/csl_select_owner_or_site_member/);
    expect(mig!).toMatch(/csl_insert_owner_of_site/);
    expect(mig!).toMatch(/csl_update_owner_or_site_owner/);
  });
  it('does NOT create a DELETE policy (archive only)', () => {
    expect(mig!).not.toMatch(/ON\s+public\.client_site_licenses\s+FOR\s+DELETE/i);
  });
  it('enforces immutability of site_id and owner_user_id via trigger', () => {
    expect(mig!).toMatch(/trg_client_site_licenses_invariants/);
    expect(mig!).toMatch(/site_id is immutable on client_site_licenses/);
    expect(mig!).toMatch(/owner_user_id is immutable on client_site_licenses/);
  });
  it('rejects file_id from a different site (cross-site coherence)', () => {
    expect(mig!).toMatch(/file_id belongs to a different site/);
  });
  it('migrations never grant any privilege on client_site_licenses to anon', () => {
    for (const sql of blobs) {
      expect(sql).not.toMatch(/GRANT\s+[^;]*ON\s+public\.client_site_licenses[^;]*TO\s+anon/i);
    }
  });
});

describe('siteLicensesService — single entry point', () => {
  it('exposes list/create/update/archive', () => {
    expect(SERVICE).toMatch(/export\s+async\s+function\s+listSiteLicenses/);
    expect(SERVICE).toMatch(/export\s+async\s+function\s+createSiteLicense/);
    expect(SERVICE).toMatch(/export\s+async\s+function\s+updateSiteLicense/);
    expect(SERVICE).toMatch(/export\s+async\s+function\s+archiveSiteLicense/);
  });
  it('archive is soft (no .delete() anywhere in the service)', () => {
    expect(SERVICE).not.toMatch(/\.delete\(\)/);
    expect(SERVICE).toMatch(/is_archived:\s*true/);
  });
  it('no service_role / any / suppressions', () => {
    expect(SERVICE).not.toMatch(/service_role/i);
    expect(SERVICE).not.toMatch(/:\s*any\b/);
    expect(SERVICE).not.toMatch(/\bas\s+any\b/);
    expect(SERVICE).not.toMatch(/@ts-ignore/);
    expect(SERVICE).not.toMatch(/eslint-disable/);
  });
  it('expiring-soon helper uses the 30-day threshold', () => {
    expect(SERVICE).toMatch(/SITE_LICENSE_EXPIRY_SOON_DAYS\s*=\s*30/);
  });
});

describe('SiteLicensesTab — UI invariants', () => {
  it('renders list, empty state and add-form testids', () => {
    expect(TAB).toMatch(/data-testid="site-licenses-tab-root"/);
    expect(TAB).toMatch(/data-testid="site-licenses-empty"/);
    expect(TAB).toMatch(/data-testid="site-licenses-list"/);
    expect(TAB).toMatch(/data-testid="site-licenses-add-toggle"/);
    expect(TAB).toMatch(/data-testid="site-licenses-form"/);
    expect(TAB).toMatch(/data-testid="site-licenses-form-submit"/);
  });
  it('uses the service layer (no direct table calls)', () => {
    expect(TAB).toMatch(/from\s+'@\/services\/siteLicensesService'/);
    expect(TAB).not.toMatch(/\.from\(['"]client_site_licenses['"]\)/);
  });
  it('never opens a Dialog (project popup ban)', () => {
    expect(TAB).not.toMatch(/<Dialog\b/);
    expect(TAB).not.toMatch(/DialogContent/);
  });
  it('does not include an upload <input type="file"> in this tab', () => {
    expect(TAB).not.toMatch(/<input[^>]*type=["']file["']/);
    expect(TAB).not.toMatch(/uploadSiteFile/);
  });
  it('lets the user pick an existing site file via a picker', () => {
    expect(TAB).toMatch(/data-testid="site-licenses-file-picker"/);
    expect(TAB).toMatch(/listSiteFiles\(/);
  });
  it('exposes archive only (no hard delete UI)', () => {
    expect(TAB).toMatch(/data-testid="site-licenses-archive"/);
    expect(TAB).not.toMatch(/Trash2/);
    expect(TAB).not.toMatch(/handleDelete/);
  });
  it('surfaces an expiring-soon badge', () => {
    expect(TAB).toMatch(/data-testid="site-licenses-expiring-soon"/);
  });
  it('renders all status variants', () => {
    for (const s of ['active', 'pending', 'expired', 'rejected', 'archived']) {
      expect(TAB).toMatch(new RegExp(`site-licenses-status-\\$\\{row\\.status\\}|${s}`));
    }
  });
  it('no service_role / any / suppressions', () => {
    expect(TAB).not.toMatch(/service_role/i);
    expect(TAB).not.toMatch(/:\s*any\b/);
    expect(TAB).not.toMatch(/\bas\s+any\b/);
    expect(TAB).not.toMatch(/@ts-ignore/);
    expect(TAB).not.toMatch(/eslint-disable/);
  });
});

describe('DashboardSiteDetail wiring', () => {
  it('mounts SiteLicensesTab in the licenses tab', () => {
    expect(DETAIL).toMatch(/<SiteLicensesTab[\s\S]*siteId=\{site\.id\}[\s\S]*canManage=\{canManage\}/);
  });
  it('does NOT keep the legacy "coming soon" stub for licenses', () => {
    expect(DETAIL).not.toMatch(/الرخص والتصاريح والمخالفات — قريباً/);
    expect(DETAIL).not.toMatch(/Licenses, permits and violations — coming soon/);
  });
});