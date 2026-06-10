import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Phase 5C-1 guard — `AdminUsers` and `AdminBusinesses` must use the
 * sanctioned bilingual primitives (`pickBi`, `useBi`, `<Bi>`) instead of
 * inline `isRTL ? 'ar' : 'en'` ternaries, and must not call
 * `toLocaleString('ar...')` (numbers/dates go through `@/lib/format`).
 */
const FILES = [
  'src/pages/admin/AdminUsers.tsx',
  'src/pages/admin/AdminBusinesses.tsx',
];

describe('Phase 5C-1 — AdminUsers / AdminBusinesses bilingual hygiene', () => {
  for (const f of FILES) {
    const src = readFileSync(join(process.cwd(), f), 'utf8');

    it(`${f} has no inline isRTL string ternaries`, () => {
      const re = /isRTL\s*\?\s*(['"])(?:\\.|(?!\1).)*\1\s*:\s*(['"])(?:\\.|(?!\2).)*\2/g;
      const matches = src.match(re) ?? [];
      expect(matches, `Expected zero string ternaries; found ${matches.length}`).toHaveLength(0);
    });

    it(`${f} does not call toLocaleString('ar...')`, () => {
      expect(src).not.toMatch(/\.toLocaleString\(\s*['"]ar/);
    });

    it(`${f} has no Arabic-Indic digit literals`, () => {
      expect(src).not.toMatch(/[\u0660-\u0669\u06F0-\u06F9]/);
    });

    it(`${f} imports a bilingual primitive`, () => {
      expect(src).toMatch(/from ['"]@\/components\/common\/Bilingual['"]/);
    });
  }
});