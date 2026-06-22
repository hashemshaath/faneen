/**
 * SITE FILES SECURITY + RLS CLOSEOUT — source-level guards.
 *
 * Locks defense-in-depth invariants after the upload model pass:
 *   - Bucket private, signed-URL only, short TTL (≤ 5 minutes).
 *   - Storage path is owner-scoped (users/{ownerUserId}/sites/{siteId}/...).
 *   - Service is the only entry point — UI never calls supabase.storage
 *     against `site-files` and never writes `client_site_files` directly.
 *   - No archive→delete escalation, no DELETE UI surface, no DELETE policy.
 *   - Migration revokes anon privileges and DELETE from authenticated.
 *   - No `service_role`, no `any`, no suppressions in service / tab.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const SERVICE = readFileSync(resolve('src/services/siteFilesService.ts'), 'utf8');
const TAB     = readFileSync(resolve('src/components/sites/SiteFilesTab.tsx'), 'utf8');

const migrationBlobs = (): string[] => {
  const dir = resolve('supabase/migrations');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => readFileSync(resolve(dir, f), 'utf8'));
};

describe('SiteFiles — bucket + URL safety', () => {
  it('targets the private `site-files` bucket', () => {
    expect(SERVICE).toMatch(/SITE_FILES_BUCKET\s*=\s*'site-files'/);
  });
  it('uses createSignedUrl only (no permanent public URL)', () => {
    expect(SERVICE).toMatch(/createSignedUrl/);
    expect(SERVICE).not.toMatch(/getPublicUrl/);
  });
  it('signed URL TTL is short (≤ 5 minutes)', () => {
    const m = SERVICE.match(/SITE_FILES_SIGNED_URL_TTL\s*=\s*([^;]+);/);
    expect(m).toBeTruthy();
    // eslint-disable-next-line no-eval -- constant numeric expression from our own source
    const ttl = Number(eval(m![1]));
    expect(Number.isFinite(ttl)).toBe(true);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(300);
  });
  it('storage path is owner+site+file scoped', () => {
    expect(SERVICE).toMatch(/users\/\$\{params\.ownerUserId\}\/sites\/\$\{params\.siteId\}\/\$\{params\.fileId\}\//);
  });
});

describe('SiteFiles — service is the single entry point', () => {
  it('UI does not call supabase.storage against the site-files bucket', () => {
    expect(TAB).not.toMatch(/storage\.from\(['"]site-files['"]\)/);
  });
  it('UI does not write client_site_files directly', () => {
    expect(TAB).not.toMatch(/\.from\(['"]client_site_files['"]\)/);
  });
  it('UI does not expose a hard-delete surface', () => {
    // archive only — service has no .delete(); component shows no delete button
    expect(TAB).not.toMatch(/Trash2/);
    expect(TAB).not.toMatch(/handleDelete/);
    expect(SERVICE).not.toMatch(/\.delete\(\)/);
  });
  it('component never opens a Dialog (project policy bans popups)', () => {
    expect(TAB).not.toMatch(/<Dialog\b/);
  });
});

describe('SiteFiles — no service_role / any / suppressions', () => {
  it('service', () => {
    expect(SERVICE).not.toMatch(/service_role/i);
    expect(SERVICE).not.toMatch(/:\s*any\b/);
    expect(SERVICE).not.toMatch(/\bas\s+any\b/);
    expect(SERVICE).not.toMatch(/@ts-ignore/);
    expect(SERVICE).not.toMatch(/eslint-disable(?!.*no-eval)/);
  });
  it('tab', () => {
    expect(TAB).not.toMatch(/service_role/i);
    expect(TAB).not.toMatch(/:\s*any\b/);
    expect(TAB).not.toMatch(/\bas\s+any\b/);
    expect(TAB).not.toMatch(/@ts-ignore/);
    expect(TAB).not.toMatch(/eslint-disable/);
  });
});

describe('SiteFiles — migration ships RLS + grants closeout', () => {
  const blobs = migrationBlobs();

  it('table migration enables RLS and ships the three named policies', () => {
    const tableMig = blobs.find((b) => /CREATE\s+TABLE\s+public\.client_site_files/i.test(b));
    expect(tableMig).toBeTruthy();
    expect(tableMig!).toMatch(/ENABLE ROW LEVEL SECURITY/i);
    expect(tableMig!).toMatch(/csf_select_owner_or_site_member/);
    expect(tableMig!).toMatch(/csf_insert_owner_of_site/);
    expect(tableMig!).toMatch(/csf_update_owner_or_site_owner/);
    // immutability trigger
    expect(tableMig!).toMatch(/client_site_files_enforce_immutable/);
    // no DELETE policy on the table
    expect(tableMig!).not.toMatch(/ON public\.client_site_files FOR DELETE/i);
    // storage policies scoped to users/{auth.uid()}
    expect(tableMig!).toMatch(/site_files_read_own_prefix/);
    expect(tableMig!).toMatch(/site_files_insert_own_prefix/);
    expect(tableMig!).toMatch(/site_files_update_own_prefix/);
  });

  it('migrations never grant SELECT/INSERT/UPDATE/DELETE on client_site_files to anon', () => {
    for (const sql of blobs) {
      // any `GRANT ... ON public.client_site_files TO anon` is forbidden
      expect(sql).not.toMatch(/GRANT\s+[^;]*ON\s+public\.client_site_files[^;]*TO\s+anon/i);
    }
  });

  it('closeout migration revokes anon access and authenticated DELETE', () => {
    const closeout = blobs.find((b) =>
      /REVOKE\s+ALL\s+ON\s+public\.client_site_files\s+FROM\s+anon/i.test(b)
      && /REVOKE\s+DELETE\s+ON\s+public\.client_site_files\s+FROM\s+authenticated/i.test(b),
    );
    expect(closeout).toBeTruthy();
  });
});
