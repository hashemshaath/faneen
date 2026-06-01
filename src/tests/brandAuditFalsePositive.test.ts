import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, 'scripts/brand-audit.mjs');
const src = fs.readFileSync(SCRIPT, 'utf-8');

describe('BRAND-AUDIT-TEST-FILE-FALSE-POSITIVE-FIX-1', () => {
  it('brand-audit script exists', () => {
    expect(fs.existsSync(SCRIPT)).toBe(true);
  });

  it('still scans user-facing source trees (src, public, supabase/functions)', () => {
    expect(src).toMatch(/['"]src['"]/);
    expect(src).toMatch(/['"]public['"]/);
    expect(src).toMatch(/['"]supabase\/functions['"]/);
  });

  it('still scans critical SEO/meta files', () => {
    for (const f of [
      'index.html',
      'public/robots.txt',
      'public/sitemap.xml',
      'public/llms.txt',
      'src/hooks/usePageMeta.ts',
      'supabase/functions/sitemap/index.ts',
    ]) {
      expect(src, `brand-audit must scan ${f}`).toContain(f);
    }
  });

  it('allowlists the legacy-name guard test file', () => {
    expect(src).toContain('src/tests/supabaseDatabaseDeepRepair1.test.ts');
  });

  it('does NOT allowlist user-facing directories (pages, components, modules, functions)', () => {
    // Match the ALLOWED_FILES Set body specifically.
    const m = src.match(/ALLOWED_FILES\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
    expect(m, 'ALLOWED_FILES set must exist').toBeTruthy();
    const body = m![1];
    expect(body).not.toMatch(/src\/pages\/(?!Privacy\.tsx)/);
    expect(body).not.toMatch(/src\/components\//);
    expect(body).not.toMatch(/src\/modules\//);
    expect(body).not.toMatch(/supabase\/functions\//);
    expect(body).not.toMatch(/^public\//m);
  });

  it('forbidden patterns still include all legacy brand variants', () => {
    for (const needle of ['faneen\\.com', 'FANEEN', 'Faneen', 'فنيين']) {
      expect(src, `brand-audit must still forbid ${needle}`).toMatch(new RegExp(needle));
    }
  });

  it('the guard test itself is allowlisted (this very file)', () => {
    expect(src).toContain('src/tests/brandAuditFalsePositive.test.ts');
  });
});