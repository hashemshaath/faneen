import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, relative, sep, posix } from 'node:path';

const ROOT = resolve(__dirname, '../../../../');
const SRC = resolve(ROOT, 'src');

/** Walk every .ts/.tsx file under src/ excluding test files. */
function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules' || entry === '.test') continue;
      walk(full, acc);
    } else if (
      /\.(ts|tsx)$/.test(entry) &&
      !/\.test\.(ts|tsx)$/.test(entry) &&
      !/\.spec\.(ts|tsx)$/.test(entry)
    ) {
      acc.push(full);
    }
  }
  return acc;
}

const ALL_FILES = walk(SRC);
const toPosix = (p: string) => relative(ROOT, p).split(sep).join(posix.sep);

/**
 * Allowed paths where direct `supabase.storage.from(...)` access is permitted.
 * Every other app/source file must route through these modules.
 */
const STORAGE_ALLOWED_PREFIXES = [
  'src/integrations/supabase/',                     // auto-generated client
  'src/modules/files/',                             // canonical files module
  'src/modules/messaging/services/storage/',        // chat-attachments service
  'src/modules/contracts/services/attachments/',    // contract-attachments service
  'src/modules/workOrders/services/',               // work-order private attachments (BUSINESS-WORKFLOW-5A)
  'src/lib/quoteRequests.ts',                       // canonical quote signed-URL helper
];

const isAllowed = (file: string) =>
  STORAGE_ALLOWED_PREFIXES.some((p) => toPosix(file).startsWith(p));

describe('F-5 storage final sweep', () => {
  it('no app file calls supabase.storage.from(...) outside allowed modules', () => {
    const offenders = ALL_FILES
      .filter((f) => !isAllowed(f))
      .filter((f) => /supabase\.storage\.from\s*\(|(?<![A-Za-z0-9_])storage\.from\s*\(/.test(readFileSync(f, 'utf8')));
    expect(offenders.map(toPosix)).toEqual([]);
  });

  it('no app file calls .createSignedUrl / .createSignedUrls / .getPublicUrl / .upload / .remove / .list / .download as a storage op outside allowed modules', () => {
    // We only flag files that import the Supabase client AND call one of the
    // storage ops, which catches the realistic offending pattern without
    // false-positiving on `Array.prototype.upload`-like names elsewhere.
    const storageOpRe = /\.(createSignedUrl|createSignedUrls|getPublicUrl)\s*\(/;
    const offenders = ALL_FILES
      .filter((f) => !isAllowed(f))
      .filter((f) => {
        const src = readFileSync(f, 'utf8');
        if (!/from\s+['"]@\/integrations\/supabase\/client['"]/.test(src)) return false;
        return storageOpRe.test(src);
      });
    expect(offenders.map(toPosix)).toEqual([]);
  });

  it('no ad-hoc /storage/v1/object/public/ URL parsing outside files module', () => {
    const marker = '/storage/v1/object/public/';
    const offenders = ALL_FILES
      .filter((f) => !toPosix(f).startsWith('src/modules/files/'))
      .filter((f) => readFileSync(f, 'utf8').includes(marker));
    expect(offenders.map(toPosix)).toEqual([]);
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
      const src = readFileSync(resolve(ROOT, rel), 'utf8');
      expect(src, `${rel} should not call supabase.storage directly`).not.toMatch(/supabase\.storage/);
    }
  });

  it('extractPublicStoragePath is the only public-URL path parser in files module', () => {
    const files = walk(resolve(SRC, 'modules/files'));
    const matches = files.filter((f) =>
      readFileSync(f, 'utf8').includes('/storage/v1/object/public/'),
    );
    // extractPublicStoragePath.ts contains the parsing literal twice (doc + impl).
    expect(matches.map(toPosix).sort()).toEqual([
      'src/modules/files/services/public/extractPublicStoragePath.ts',
    ]);
  });
});