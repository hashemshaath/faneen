import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const v3Dir = join(root, 'src/components/search/v3');
const page = readFileSync(join(root, 'src/pages/SearchV3.tsx'), 'utf8');

function readAllSources(dir: string): { path: string; src: string }[] {
  const out: { path: string; src: string }[] = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (name.isDirectory()) {
      if (name.name === '__tests__') continue;
      out.push(...readAllSources(join(dir, name.name)));
    } else if (name.name.endsWith('.tsx') || name.name.endsWith('.ts')) {
      out.push({ path: join(dir, name.name), src: readFileSync(join(dir, name.name), 'utf8') });
    }
  }
  return out;
}

const sources = [{ path: 'src/pages/SearchV3.tsx', src: page }, ...readAllSources(v3Dir)];

describe('SEARCH V3 — no-legacy invariants', () => {
  it('never builds a "/q/<username>" link for a business', () => {
    for (const { path, src } of sources) {
      expect(/['"]\/q\/[^'"]*\$\{?[a-zA-Z_]*username/.test(src), `${path} contains /q/<username>`).toBe(false);
      // Defensive: no bare string template that prefixes /q/ with a username var
      expect(/`\/q\/\$\{[^}]*username[^}]*\}`/.test(src), `${path} backtick /q/<username>`).toBe(false);
    }
  });

  it('never hard-codes the literal "غير مصنّف" / "Uncategorized" anywhere visible', () => {
    // Card filter handles it at render-time but no V3 source should *bake it in*.
    for (const { path, src } of sources) {
      if (path.endsWith('SearchResultCardV3.tsx')) continue; // contains the deny-list constant
      expect(src.includes("'غير مصنّف'"), `${path} hard-codes غير مصنّف`).toBe(false);
      expect(src.includes('"غير مصنّف"'), `${path} hard-codes غير مصنّف`).toBe(false);
      expect(/['"]Uncategorized['"]/.test(src), `${path} hard-codes Uncategorized`).toBe(false);
    }
  });

  it('uses getBusinessProfileHref to build profile links (never bare /${username})', () => {
    expect(sources.some(({ src }) => src.includes('getBusinessProfileHref'))).toBe(true);
  });

  it('does not depend on heavy map/chart libraries', () => {
    for (const { path, src } of sources) {
      expect(/from\s+['"]leaflet['"]/.test(src), `${path} imports leaflet`).toBe(false);
      expect(/from\s+['"]react-leaflet['"]/.test(src), `${path} imports react-leaflet`).toBe(false);
      expect(/from\s+['"]recharts['"]/.test(src), `${path} imports recharts`).toBe(false);
    }
  });
});