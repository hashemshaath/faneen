import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');
const exists = (rel: string) => fs.existsSync(path.join(ROOT, rel));

describe('CI-LEGACY-DRIFT-REPAIR-1 — guards', () => {
  it('every JSON-LD snapshot fixture points to an existing source file', () => {
    const fixtures = JSON.parse(read('scripts/jsonld-snapshots/index.json')) as Record<string, unknown>;
    const missing = Object.keys(fixtures).filter((p) => !exists(p));
    expect(missing, `Missing fixture sources: ${missing.join(', ')}`).toEqual([]);
  });

  it('no JSON-LD fixture references the removed TopProvidersSection component', () => {
    const raw = read('scripts/jsonld-snapshots/index.json');
    expect(raw).not.toMatch(/TopProvidersSection/);
  });

  it('public/sitemap.xml includes the help sub-sitemap (matches edge function)', () => {
    const xml = read('public/sitemap.xml');
    expect(xml).toMatch(/type=help/);
  });

  it('package-lock.json contains xlsx when package.json declares it', () => {
    const pkg = JSON.parse(read('package.json'));
    const declared =
      (pkg.dependencies && pkg.dependencies.xlsx) ||
      (pkg.devDependencies && pkg.devDependencies.xlsx);
    if (!declared) return;
    const lock = read('package-lock.json');
    expect(lock).toMatch(/"node_modules\/xlsx"/);
  });

  it('canonical sitemap types in edge function are mirrored in public/sitemap.xml', () => {
    const edge = read('supabase/functions/sitemap/index.ts');
    const types = Array.from(edge.matchAll(/type === "([a-z]+)"/g)).map((m) => m[1]);
    expect(types).toContain('help');
    const xml = read('public/sitemap.xml');
    for (const t of types) {
      if (t === 'static') continue;
      expect(xml, `sitemap.xml missing type=${t}`).toMatch(new RegExp(`type=${t}\\b`));
    }
  });

  it('audit fixture ownership doc exists', () => {
    expect(exists('docs/ci-audit-fixture-ownership.md')).toBe(true);
    expect(exists('docs/ci-legacy-drift-report.md')).toBe(true);
  });

  it('no stale /admin/help-center route in source (canonical is /admin/help)', () => {
    // Scan src/ only; docs/audit scripts may legitimately mention the old path.
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(rel);
        else if (/\.(ts|tsx)$/.test(entry.name)) {
          const src = read(rel);
          if (/['"`]\/admin\/help-center['"`]/.test(src)) hits.push(rel);
        }
      }
    };
    walk('src');
    expect(hits, `Stale /admin/help-center references: ${hits.join(', ')}`).toEqual([]);
  });
});