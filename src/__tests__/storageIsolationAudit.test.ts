import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../');
const SCRIPT = resolve(ROOT, 'scripts/storage-isolation-audit.mjs');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

describe('F-6 storage isolation audit script', () => {
  it('script exists', () => {
    expect(existsSync(SCRIPT)).toBe(true);
  });

  it('declares the expected allowed paths', () => {
    const src = read('scripts/storage-isolation-audit.mjs');
    expect(src).toContain('src/modules/files/');
    expect(src).toContain('src/modules/messaging/services/storage/');
    expect(src).toContain('src/modules/contracts/services/attachments/');
    expect(src).toContain('src/integrations/supabase/');
    expect(src).toContain('src/lib/quoteRequests.ts');
    expect(src).toContain('src/lib/contract-attachments.ts');
  });

  it('public URL parsing is allowed only in extractPublicStoragePath.ts', () => {
    const src = read('scripts/storage-isolation-audit.mjs');
    expect(src).toContain('src/modules/files/services/public/extractPublicStoragePath.ts');
  });

  it('migrated callsites remain clean (F-2 / F-3 / F-4 regression)', () => {
    const migrated = [
      'src/components/ui/image-upload.tsx',
      'src/components/dashboard/DashboardLayout.tsx',
      'src/pages/dashboard/DashboardShowcase.tsx',
      'src/components/blog/RichMarkdownEditor.tsx',
      'src/components/admin/CrDocumentScanner.tsx',
      'src/pages/admin/AdminBranding.tsx',
    ];
    for (const rel of migrated) {
      expect(read(rel), `${rel} must not call supabase.storage directly`).not.toMatch(
        /supabase\.storage/,
      );
    }
  });

  it('exits 0 (no unauthorized direct storage access)', () => {
    expect(() =>
      execFileSync('node', [SCRIPT], { cwd: ROOT, stdio: 'pipe' }),
    ).not.toThrow();
  });

  it('is wired into package.json', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.scripts['storage-isolation-audit']).toBe(
      'node scripts/storage-isolation-audit.mjs',
    );
  });

  it('is wired into the CI workflow', () => {
    const yml = read('.github/workflows/code-audit.yml');
    expect(yml).toContain('Storage Isolation Audit');
    expect(yml).toContain('node scripts/storage-isolation-audit.mjs');
  });
});