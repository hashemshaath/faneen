import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'glob';

/**
 * Phase 5A scope: enforce Latin-digits / Latin-formatting policy in all
 * public-core pages. No raw 'ar-SA' locale calls for number/date display.
 * (PDF export files and admin/dashboard are out of scope and excluded.)
 */
const SCOPE_GLOBS = [
  'src/pages/Index.tsx',
  'src/pages/Search.tsx',
  'src/pages/Quote.tsx',
  'src/pages/Auth.tsx',
  'src/pages/Onboarding.tsx',
  'src/components/home/**/*.{ts,tsx}',
];

const files = SCOPE_GLOBS.flatMap((g) => globSync(g, { cwd: process.cwd() }));

describe('Phase 5A — Numbers/Codes/Identity policy in scope', () => {
  it('no Arabic-Indic digit literals in source', () => {
    for (const f of files) {
      const src = readFileSync(join(process.cwd(), f), 'utf8');
      expect(src, `${f} contains Arabic-Indic digits`).not.toMatch(/[\u0660-\u0669\u06F0-\u06F9]/);
    }
  });

  it('no toLocaleString("ar"...) for number rendering in scope', () => {
    for (const f of files) {
      const src = readFileSync(join(process.cwd(), f), 'utf8');
      // Allow JSON-LD inLanguage strings; flag only call sites.
      expect(src, `${f} uses toLocaleString('ar...')`).not.toMatch(/\.toLocaleString\(\s*['"]ar/);
    }
  });
});
