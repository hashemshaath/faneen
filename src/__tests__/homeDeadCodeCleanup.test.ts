import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

const LEGACY_HOME = [
  'HeroSection',
  'CTASection',
  'CategoriesSection',
  'FeaturesSection',
  'LatestBlogSection',
  'LatestOffersSection',
  'LatestProjectsSection',
  'MembershipSection',
  'SearchSection',
  'StatsSection',
  'TopProvidersSection',
] as const;

const LEGACY_ASSETS = ['hero-bg.webp', 'hero-bg.jpg'] as const;

/** Ripgrep wrapper — returns matching `path:line` lines, or [] if none.
 *  Excludes this test file so its own pattern strings don't self-match. */
const SELF = 'src/__tests__/homeDeadCodeCleanup.test.ts';
const rg = (pattern: string): string[] => {
  try {
    const out = execSync(`rg -n --no-heading ${JSON.stringify(pattern)} src/`, {
      cwd: root,
      encoding: 'utf8',
    });
    return out.split('\n').filter((line) => line && !line.startsWith(SELF));
  } catch {
    return []; // exit 1 = no matches
  }
};

describe('Home v1 dead-code cleanup', () => {
  it('deletes every legacy v1 home section file', () => {
    for (const name of LEGACY_HOME) {
      const p = `src/components/home/${name}.tsx`;
      expect(existsSync(join(root, p)), `${p} should be deleted`).toBe(false);
    }
  });

  it('deletes the stale hero-bg assets', () => {
    for (const asset of LEGACY_ASSETS) {
      const p = `src/assets/${asset}`;
      expect(existsSync(join(root, p)), `${p} should be deleted`).toBe(false);
    }
  });

  it('no source file imports any deleted legacy v1 home section', () => {
    for (const name of LEGACY_HOME) {
      const hits = rg(`from ['"]@/components/home/${name}['"]`);
      expect(hits, `${name} still imported in:\n${hits.join('\n')}`).toEqual([]);
    }
  });

  it('no source file references the deleted hero-bg assets', () => {
    for (const asset of LEGACY_ASSETS) {
      const hits = rg(asset);
      expect(hits, `${asset} still referenced in:\n${hits.join('\n')}`).toEqual([]);
    }
  });

  it('Index.tsx still wires up the active HomeV2', () => {
    const index = read('src/pages/Index.tsx');
    expect(index).toMatch(/from\s+['"]@\/components\/home\/v2\/HomeV2['"]/);
    expect(index).toMatch(/<HeroV2\s*\/>/);
  });

  it('HomeV2 does not import any deleted legacy v1 section', () => {
    const home = read('src/components/home/v2/HomeV2.tsx');
    for (const name of LEGACY_HOME) {
      expect(home).not.toMatch(new RegExp(`@/components/home/${name}['"]`));
    }
  });

  it('active HomeV2 hero slide assets still exist', () => {
    for (const slide of [1, 2, 3, 4]) {
      const p = `src/assets/home/hero-slide-${slide}.webp`;
      expect(existsSync(join(root, p)), `${p} must remain`).toBe(true);
    }
  });
});