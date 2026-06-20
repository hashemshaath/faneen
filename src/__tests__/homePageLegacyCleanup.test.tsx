import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const SELF = 'src/__tests__/homePageLegacyCleanup.test.tsx';
const rg = (pattern: string): string[] => {
  try {
    const out = execSync(`rg -n --no-heading ${JSON.stringify(pattern)} src/`, {
      cwd: root,
      encoding: 'utf8',
    });
    return out.split('\n').filter((l) => l && !l.startsWith(SELF));
  } catch {
    return [];
  }
};

/**
 * HOME-LEGACY-CLEANUP — guards that `/` only ever resolves to the canonical
 * `<Index />` + `<HeroV2 />` homepage, and that no legacy `Home.tsx` /
 * `home/legacy/**` files reappear.
 */
describe('Home page legacy cleanup invariants', () => {
  const app = read('src/App.tsx');
  const index = read('src/pages/Index.tsx');

  it('route "/" mounts the canonical <Index /> exactly once', () => {
    const matches = app.match(/path="\/"\s+element=\{<Index\s*\/>\}/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('no legacy Home page file exists', () => {
    expect(existsSync(join(root, 'src/pages/Home.tsx'))).toBe(false);
    expect(existsSync(join(root, 'src/pages/HomeLegacy.tsx'))).toBe(false);
    expect(existsSync(join(root, 'src/pages/HomeV1.tsx'))).toBe(false);
  });

  it('no src/components/home/legacy/** directory remains', () => {
    expect(existsSync(join(root, 'src/components/home/legacy'))).toBe(false);
  });

  it('src/components/home only contains the canonical surface', () => {
    const entries = readdirSync(join(root, 'src/components/home')).sort();
    expect(entries).toEqual(
      ['HeroParticles.tsx', 'WhyQitaatSection.tsx', 'v2'].sort(),
    );
  });

  it('no source file imports a legacy home page module', () => {
    for (const name of ['Home', 'HomeLegacy', 'HomeV1']) {
      const hits = rg(`from ['\"]@/pages/${name}['\"]`);
      expect(hits, `${name} still imported:\n${hits.join('\n')}`).toEqual([]);
    }
  });

  it('Index.tsx renders the canonical HeroV2 and tracks image perf as "home"', () => {
    expect(index).toMatch(/from\s+['"]@\/components\/home\/v2\/HomeV2['"]/);
    expect(index).toMatch(/<HeroV2\s*\/?>/);
    expect(index).toMatch(/useImagePerfTracking\(['"]home['"]\)/);
  });

  it('Index.tsx renders exactly one <main> and a Navbar + Footer shell', () => {
    const opens = index.match(/<main(\s|>)/g) ?? [];
    expect(opens.length).toBe(1);
    expect(index).toMatch(/<Navbar\s*\/>/);
    expect(index).toMatch(/<Footer\s*\/>/);
  });

  it('Index.tsx ships canonical SEO + JSON-LD for "/"', () => {
    expect(index).toMatch(/usePageMeta\(/);
    expect(index).toMatch(/useMultiJsonLd\(/);
    expect(index).toMatch(/canonical:\s*'https:\/\/qitaat\.com\/'/);
    expect(index).toMatch(/'@type':\s*'WebSite'/);
    expect(index).toMatch(/'@type':\s*'BreadcrumbList'/);
    expect(index).toMatch(/'@type':\s*'FAQPage'/);
  });

  it('homepage has no admin / dashboard / onboarding deep links and no hex literals', () => {
    expect(index).not.toMatch(/to=["']\/(dashboard|admin|onboarding)/);
    expect(index).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('homepage has no TS / ESLint suppressions', () => {
    expect(index).not.toMatch(/@ts-ignore|@ts-expect-error|eslint-disable/);
    expect(index).not.toMatch(/\bas\s+any\b|:\s*any\b/);
  });
});