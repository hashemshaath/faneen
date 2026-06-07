/**
 * Legacy Taxonomy Final Closeout - guard test.
 *
 * Fails the build if any runtime file under src/ or supabase/functions/
 * reintroduces a reference to the removed legacy taxonomy surface.
 * See docs/legacy-taxonomy-final-closeout.md.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOTS = ['src', 'supabase/functions'];

const ALLOWED_PATH_FRAGMENTS = [
  'src/integrations/supabase/types.ts',
  'src/tests/legacyTaxonomyClosure.test.ts',
  'src/tests/phase18hLegacyColumnDrop.test.ts',
  'src/tests/phase18iLegacyCategoryIdDrop.test.ts',
  `supabase${sep}migrations`,
  'src/modules/taxonomy/migration-services.ts',
  'src/modules/taxonomy/components/TaxonomyMigrationPanel.tsx',
  'src/modules/taxonomy/contract-services.ts',
  'src/modules/categories/services/__tests__/catalog-reference-migration.test.ts',
  'src/services/search/__tests__',
];

const FORBIDDEN_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: "supabase.from('categories')", regex: /from\(\s*['"]categories['"]\s*\)/ },
  { label: "supabase.from('tags')", regex: /from\(\s*['"]tags['"]\s*\)/ },
  { label: "supabase.from('entity_tags')", regex: /from\(\s*['"]entity_tags['"]\s*\)/ },
  { label: 'embedded categories(...) join', regex: /['"]categories\s*\(/ },
  { label: 'embedded tags(...) join', regex: /['"]\s*tags\s*\(/ },
  { label: 'businesses.sectors', regex: /businesses[\s\S]{0,80}\.sectors\b/ },
  { label: 'sub_services column', regex: /\bsub_services\b/ },
  { label: 'business_services.category_id', regex: /business_services[\s\S]{0,80}\.category_id\b/ },
  { label: 'showcase_submissions.sector_slug', regex: /\bsector_slug\b/ },
];

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
      walk(full, out);
    } else if (/\.(ts|tsx|js|jsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function isAllowed(path: string): boolean {
  const rel = relative(process.cwd(), path).replaceAll('\\', '/');
  return ALLOWED_PATH_FRAGMENTS.some((frag) =>
    rel.includes(frag.replaceAll('\\', '/')),
  );
}

describe('legacy taxonomy closure guard', () => {
  const files = ROOTS.flatMap((r) => walk(r)).filter((f) => !isAllowed(f));

  for (const { label, regex } of FORBIDDEN_PATTERNS) {
    it(`no runtime file references: ${label}`, () => {
      const offenders: string[] = [];
      for (const file of files) {
        const src = readFileSync(file, 'utf8');
        if (regex.test(src)) offenders.push(relative(process.cwd(), file));
      }
      expect(offenders, `Forbidden reference reintroduced: ${label}`).toEqual([]);
    });
  }
});
