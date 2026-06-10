import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Phase 5C-5 guard — Admin batch (Contact Messages, Brand Detail, Memberships,
 * Membership Payments, System Access, Brands) must use sanctioned bilingual
 * primitives (`pickBi`, `useBi`, `<Bi>`) instead of inline
 * `isRTL ? 'ar' : 'en'` ternaries, must not call `toLocaleString('ar...')`,
 * and must not contain Arabic-Indic digit literals.
 */
const FILES = [
  'src/pages/admin/AdminContactMessages.tsx',
  'src/pages/admin/AdminBrandDetail.tsx',
  'src/pages/admin/AdminMemberships.tsx',
  'src/pages/admin/AdminMembershipPayments.tsx',
  'src/pages/admin/AdminSystemAccess.tsx',
  'src/pages/admin/AdminBrands.tsx',
];

describe('Phase 5C-5 — Admin bilingual hygiene', () => {
  for (const f of FILES) {
    const src = readFileSync(join(process.cwd(), f), 'utf8');

    it(`${f} has no inline isRTL string/template ternaries`, () => {
      // single/double quotes
      const reStr = /isRTL\s*\?\s*(['"])(?:\\.|(?!\1).)*\1\s*:\s*(['"])(?:\\.|(?!\2).)*\2/g;
      // backtick templates
      const reTpl = /isRTL\s*\?\s*`[^`]*`\s*:\s*`[^`]*`/g;
      const m = [...(src.match(reStr) ?? []), ...(src.match(reTpl) ?? [])];
      expect(m, `Expected zero string ternaries; found ${m.length}`).toHaveLength(0);
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