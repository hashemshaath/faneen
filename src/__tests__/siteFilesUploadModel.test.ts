/**
 * SITE FILES UPLOAD MODEL — source-level guards.
 *
 * Locks in the upload model pass:
 *   - Private bucket `site-files`, RLS-scoped storage path
 *     `users/{ownerUserId}/sites/{siteId}/{fileId}/{safeName}`.
 *   - Service layer is the single entry point for site files; UI never
 *     calls supabase.storage / client_site_files directly.
 *   - No popups: upload form is inline (no <Dialog>).
 *   - No hard delete — archive only.
 *   - File size capped at 10 MB; dangerous extensions blocked.
 *   - No service_role on the frontend; no `any`/suppressions added.
 *   - Migration ships the table, RLS policies, and storage policies.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const SERVICE = readFileSync(resolve('src/services/siteFilesService.ts'), 'utf8');
const TAB     = readFileSync(resolve('src/components/sites/SiteFilesTab.tsx'), 'utf8');

describe('siteFilesService — contract & safety', () => {
  it('targets the private `site-files` bucket', () => {
    expect(SERVICE).toMatch(/SITE_FILES_BUCKET\s*=\s*'site-files'/);
  });
  it('caps file size at 10 MB', () => {
    expect(SERVICE).toMatch(/SITE_FILES_MAX_BYTES\s*=\s*10\s*\*\s*1024\s*\*\s*1024/);
  });
  it('builds canonical storage path: users/{ownerUserId}/sites/{siteId}/{fileId}/{name}', () => {
    expect(SERVICE).toMatch(/users\/\$\{params\.ownerUserId\}\/sites\/\$\{params\.siteId\}\/\$\{params\.fileId\}\/\$\{safeName\(params\.fileName\)\}/);
  });
  it('issues short-lived signed URLs (no permanent public URL)', () => {
    expect(SERVICE).toMatch(/createSignedUrl/);
    expect(SERVICE).not.toMatch(/getPublicUrl/);
  });
  it('exposes archive (no hard delete)', () => {
    expect(SERVICE).toMatch(/export async function archiveSiteFile/);
    expect(SERVICE).not.toMatch(/\.delete\(\)/);
  });
  it('rejects forbidden extensions and oversize files via isAllowedSiteFile', () => {
    expect(SERVICE).toMatch(/FORBIDDEN_EXTENSIONS/);
    expect(SERVICE).toMatch(/reason:\s*'size'/);
    expect(SERVICE).toMatch(/reason:\s*'extension'/);
  });
  it('does not introduce service_role / any / suppressions', () => {
    expect(SERVICE).not.toMatch(/service_role/i);
    expect(SERVICE).not.toMatch(/:\s*any\b/);
    expect(SERVICE).not.toMatch(/\bas\s+any\b/);
    expect(SERVICE).not.toMatch(/@ts-ignore/);
    expect(SERVICE).not.toMatch(/eslint-disable/);
  });
});

describe('SiteFilesTab — inline upload UI (no popups)', () => {
  it('uses the service layer for uploads/archive/signed URLs', () => {
    expect(TAB).toMatch(/uploadSiteFile/);
    expect(TAB).toMatch(/archiveSiteFile/);
    expect(TAB).toMatch(/getSiteFileSignedUrl/);
  });
  it('never opens a Dialog (project policy bans popups)', () => {
    expect(TAB).not.toMatch(/<Dialog\b/);
    expect(TAB).not.toMatch(/DialogContent/);
  });
  it('shows upload trigger only when canManage is true', () => {
    expect(TAB).toMatch(/canManage\s*&&\s*!formOpen/);
    expect(TAB).toMatch(/data-testid="site-files-upload-toggle"/);
  });
  it('renders the inline form and submit button', () => {
    expect(TAB).toMatch(/data-testid="site-files-upload-form"/);
    expect(TAB).toMatch(/data-testid="site-files-upload-submit"/);
  });
  it('separates "own" and "linked" sections', () => {
    expect(TAB).toMatch(/data-testid="site-files-own-section"/);
    expect(TAB).toMatch(/data-testid="site-files-linked-section"/);
  });
});

describe('Migration ships the table + RLS + storage policies', () => {
  it('has a migration that creates client_site_files with RLS + storage policies', () => {
    const dir = resolve('supabase/migrations');
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql'));
    const blobs = files.map((f) => readFileSync(resolve(dir, f), 'utf8'));
    const tableMig = blobs.find((b) => /CREATE\s+TABLE\s+public\.client_site_files/i.test(b));
    expect(tableMig).toBeTruthy();
    expect(tableMig!).toMatch(/ENABLE ROW LEVEL SECURITY/i);
    expect(tableMig!).toMatch(/csf_select_owner_or_site_member/);
    expect(tableMig!).toMatch(/csf_insert_owner_of_site/);
    expect(tableMig!).toMatch(/csf_update_owner_or_site_owner/);
    expect(tableMig!).toMatch(/client_site_files_enforce_immutable/);
    expect(tableMig!).toMatch(/site_files_read_own_prefix/);
    expect(tableMig!).toMatch(/site_files_insert_own_prefix/);
    // No DELETE policy on the table (archive only)
    expect(tableMig!).not.toMatch(/ON public\.client_site_files FOR DELETE/i);
  });
});