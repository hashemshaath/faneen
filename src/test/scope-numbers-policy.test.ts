import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'glob';

/**
 * Phase 5A + 5B scope: enforce Latin-digits / Latin-formatting policy across
 * public-core, secondary public pages, admin panel, and provider dashboard.
 * No Arabic-Indic digit literals, no `toLocaleString('ar...')` calls.
 * PDF export and the digit-normalization helper itself remain excluded.
 */
const SCOPE_GLOBS = [
  // Public core (Phase 5A)
  'src/pages/Index.tsx',
  'src/pages/Search.tsx',
  'src/pages/Quote.tsx',
  'src/pages/Auth.tsx',
  'src/pages/Onboarding.tsx',
  'src/components/home/**/*.{ts,tsx}',
  // Secondary public (Phase 5B)
  'src/pages/About.tsx',
  'src/pages/Contact.tsx',
  'src/pages/Categories.tsx',
  'src/pages/ForProviders.tsx',
  'src/pages/Membership.tsx',
  'src/pages/Offers.tsx',
  'src/pages/Privacy.tsx',
  'src/pages/Terms.tsx',
  'src/pages/SectorLanding.tsx',
  // Admin + Dashboard (Phase 5B — numbers/codes/dates only)
  'src/pages/admin/**/*.{ts,tsx}',
  'src/pages/dashboard/**/*.{ts,tsx}',
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
