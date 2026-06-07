/**
 * Legacy Taxonomy Final Closeout - guard test.
 *
 * Fails the build if any runtime file under src/ or supabase/functions/
 * reintroduces a Supabase call against the removed legacy taxonomy
 * tables (categories / tags / entity_tags). Column-level legacy fields
 * (businesses.sectors/sub_services/category_id, business_services.category_id,
 * projects.category_id, showcase_submissions.sector_slug) are already
 * guarded by the phase 18h/18i drop-guard tests and the database itself,
 * since those columns no longer exist - any runtime read would fail.
 *
 * See docs/legacy-taxonomy-final-closeout.md.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOTS = ['src', 'supabase/functions'];

const ALLOWED_PATH_FRAGMENTS = [
  'src/integrations/supabase/types.ts',
  'src/tests/legacyTaxonomyClosure.test.ts',
  `supabase${sep}migrations`,
  // Inventory snapshot mentions legacy table names in comments only;
  // the runtime queries themselves are gone (return hard-coded 0).
  'src/modules/taxonomy/migration-services.ts',
  // Guard / governance tests that assert the legacy is gone.
  'src/modules/categories/services/__tests__/catalog-reference-migration.test.ts',
];

const FORBIDDEN_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: "supabase.from('categories')", regex: /from\(\s*['"]categories['"]\s*\)/ },
  { label: "supabase.from('tags')", regex: /from\(\s*['"]tags['"]\s*\)/ },
  { label: "supabase.from('entity_tags')", regex: /from\(\s*['"]entity_tags['"]\s*\)/ },
  // Embedded PostgREST relation join `categories(` not preceded by a
  // taxonomy_/help_/private_/brand_ prefix (those tables are legitimate).
  { label: 'embedded categories(...) join', regex: /(?<![a-zA-Z_])categories\s*\(/ },
  { label: 'embedded tags(...) join', regex: /(?<![a-zA-Z_])tags\s*\(\s*['"]?[a-z_]/ },
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

/**
 * Strip line and block comments so the guard only scans executable code.
 * (Mentions in JSDoc/comments are allowed - reviewers need to discuss the
 * legacy in context without tripping CI.)
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

describe('legacy taxonomy closure guard', () => {
  const files = ROOTS.flatMap((r) => walk(r)).filter((f) => !isAllowed(f));

  for (const { label, regex } of FORBIDDEN_PATTERNS) {
    it(`no runtime file references: ${label}`, () => {
      const offenders: string[] = [];
      for (const file of files) {
        const src = stripComments(readFileSync(file, 'utf8'));
        if (regex.test(src)) offenders.push(relative(process.cwd(), file));
      }
      expect(offenders, `Forbidden reference reintroduced: ${label}`).toEqual([]);
    });
  }
});
