/**
 * SITE LICENSES + PERMITS SECURITY CLOSEOUT — source-level guards.
 *
 * Defense-in-depth invariants for `client_site_licenses`:
 *   - RLS enabled; no anon grants; no DELETE for `authenticated`.
 *   - Three named policies, all scoped to auth.uid()/site ownership/admin.
 *   - Immutability of `site_id` and `owner_user_id` enforced by trigger.
 *   - Cross-site `file_id` linking rejected by trigger.
 *   - Service layer = single entry point; UI never calls the table directly,
 *     never opens a Dialog, never includes an upload <input>, never
 *     hard-deletes, never references `service_role`.
 *   - UI does not inject `owner_user_id` — it is derived in the service
 *     from `auth.getUser()` so it cannot be tampered with from the client.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const SERVICE = readFileSync(resolve('src/services/siteLicensesService.ts'), 'utf8');
const TAB     = readFileSync(resolve('src/components/sites/SiteLicensesTab.tsx'), 'utf8');

const migrationBlobs = (): string[] => {
  const dir = resolve('supabase/migrations');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => readFileSync(resolve(dir, f), 'utf8'));
};

describe('client_site_licenses — DB closeout', () => {
  const blobs = migrationBlobs();
  const mig = blobs.find((b) => /CREATE\s+TABLE\s+public\.client_site_licenses/i.test(b));

  it('migration exists and enables RLS', () => {
    expect(mig).toBeTruthy();
    expect(mig!).toMatch(/ALTER\s+TABLE\s+public\.client_site_licenses\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
  });

  it('no overly-permissive policy (USING (true) / WITH CHECK (true))', () => {
    // Restrict the scan to the licenses migration to avoid false positives.
    const section = mig!.split('client_site_licenses').join('CSL');
    // Look for any policy on the table that uses bare `true`
    const policyChunks = section.match(/CREATE\s+POLICY[\s\S]+?;/gi) ?? [];
    for (const p of policyChunks) {
      if (!/CSL/i.test(p)) continue;
      expect(p).not.toMatch(/USING\s*\(\s*true\s*\)/i);
      expect(p).not.toMatch(/WITH\s+CHECK\s*\(\s*true\s*\)/i);
    }
  });

  it('grants: authenticated has SELECT/INSERT/UPDATE; service_role ALL', () => {
    expect(mig!).toMatch(/GRANT\s+SELECT,\s*INSERT,\s*UPDATE\s+ON\s+public\.client_site_licenses\s+TO\s+authenticated/i);
    expect(mig!).toMatch(/GRANT\s+ALL\s+ON\s+public\.client_site_licenses\s+TO\s+service_role/i);
  });

  it('no anon grants anywhere across migrations', () => {
    for (const sql of blobs) {
      expect(sql).not.toMatch(/GRANT\s+[^;]*ON\s+public\.client_site_licenses[^;]*TO\s+anon/i);
    }
  });

  it('authenticated cannot DELETE: REVOKE DELETE + no DELETE policy', () => {
    expect(mig!).toMatch(/REVOKE\s+DELETE\s+ON\s+public\.client_site_licenses\s+FROM\s+authenticated/i);
    expect(mig!).not.toMatch(/ON\s+public\.client_site_licenses\s+FOR\s+DELETE/i);
  });

  it('three named scoped policies — no public/all policy', () => {
    expect(mig!).toMatch(/csl_select_owner_or_site_member/);
    expect(mig!).toMatch(/csl_insert_owner_of_site/);
    expect(mig!).toMatch(/csl_update_owner_or_site_owner/);
    expect(mig!).not.toMatch(/FOR\s+ALL/i);
    // Every policy must scope to auth.uid()
    const policyChunks = mig!.match(/CREATE\s+POLICY[\s\S]+?;/gi) ?? [];
    for (const p of policyChunks) {
      if (!/client_site_licenses/i.test(p)) continue;
      expect(p).toMatch(/auth\.uid\(\)/);
    }
  });

  it('immutability + cross-site coherence enforced by trigger', () => {
    expect(mig!).toMatch(/trg_client_site_licenses_invariants/);
    expect(mig!).toMatch(/site_id is immutable on client_site_licenses/);
    expect(mig!).toMatch(/owner_user_id is immutable on client_site_licenses/);
    expect(mig!).toMatch(/file_id belongs to a different site/);
  });

  it('function pins search_path (no mutable search_path)', () => {
    expect(mig!).toMatch(/client_site_licenses_enforce_invariants[\s\S]+SET\s+search_path\s*=\s*public/i);
  });
});

describe('siteLicensesService — security invariants', () => {
  it('never references service_role', () => {
    expect(SERVICE.replace(/service_role/g, '')).toBe(SERVICE); // hard fail if present
  });
  it('derives owner_user_id from auth.getUser() — not from UI payload', () => {
    expect(SERVICE).toMatch(/supabase\.auth\.getUser\(\)|getCurrentUser\(\)/);
    expect(SERVICE).toMatch(/owner_user_id:\s*userId/);
    // UpdateSiteLicenseInput must not allow changing owner_user_id / site_id
    const updIface = SERVICE.match(/UpdateSiteLicenseInput\s*\{[\s\S]*?\}/);
    expect(updIface).toBeTruthy();
    expect(updIface![0]).not.toMatch(/owner_user_id/);
    expect(updIface![0]).not.toMatch(/site_id/);
  });
  it('archive is soft (no .delete() in service)', () => {
    expect(SERVICE).not.toMatch(/\.delete\(\)/);
    expect(SERVICE).toMatch(/is_archived:\s*true/);
    expect(SERVICE).toMatch(/status:\s*'archived'/);
  });
  it('listSiteLicenses excludes archived by default', () => {
    expect(SERVICE).toMatch(/includeArchived\s*=\s*false/);
    expect(SERVICE).toMatch(/\.eq\('is_archived',\s*false\)/);
  });
  it('no `any` / `as any` / suppressions', () => {
    expect(SERVICE).not.toMatch(/:\s*any\b/);
    expect(SERVICE).not.toMatch(/\bas\s+any\b/);
    expect(SERVICE).not.toMatch(/@ts-ignore/);
    expect(SERVICE).not.toMatch(/@ts-nocheck/);
    expect(SERVICE).not.toMatch(/eslint-disable/);
  });
});

describe('SiteLicensesTab — UI security invariants', () => {
  it('uses the service layer and never touches the table directly', () => {
    expect(TAB).toMatch(/from\s+'@\/services\/siteLicensesService'/);
    expect(TAB).not.toMatch(/\.from\(['"]client_site_licenses['"]\)/);
  });
  it('never opens a Dialog (popup ban)', () => {
    expect(TAB).not.toMatch(/<Dialog\b/);
    expect(TAB).not.toMatch(/DialogContent/);
  });
  it('no upload <input type="file"> and no uploadSiteFile call', () => {
    expect(TAB).not.toMatch(/<input[^>]*type=["']file["']/);
    expect(TAB).not.toMatch(/uploadSiteFile/);
  });
  it('linked file picker only references existing site files (no cross-site)', () => {
    expect(TAB).toMatch(/listSiteFiles\(siteId\)/);
    expect(TAB).toMatch(/data-testid="site-licenses-file-picker"/);
  });
  it('no hard-delete UI surface', () => {
    expect(TAB).not.toMatch(/Trash2/);
    expect(TAB).not.toMatch(/handleDelete/);
    expect(TAB).toMatch(/archiveSiteLicense\(/);
  });
  it('does not inject owner_user_id from UI', () => {
    expect(TAB).not.toMatch(/owner_user_id/);
  });
  it('no service_role / any / suppressions / hardcoded hex', () => {
    expect(TAB).not.toMatch(/service_role/i);
    expect(TAB).not.toMatch(/:\s*any\b/);
    expect(TAB).not.toMatch(/\bas\s+any\b/);
    expect(TAB).not.toMatch(/@ts-ignore/);
    expect(TAB).not.toMatch(/eslint-disable/);
    expect(TAB).not.toMatch(/#[0-9a-fA-F]{6}\b/);
  });
});