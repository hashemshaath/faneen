import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * ADMIN UX RECONSOLIDATION PHASE 6 — Content & Directory Center guards.
 *
 * Read-only structural assertions on the Content Center shell, its
 * presentational landings, and the routing surface. We do NOT mount
 * React here; the contract is structural (no query/mutation leakage
 * into the shell, legacy deep links preserved, no destructive imports,
 * no SEO / sitemap / visibility / taxonomy / asset behavior changes).
 */

const root = resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

const APP = read('src/App.tsx');
const CENTER = read('src/pages/admin/AdminContentCenter.tsx');
const OVERVIEW = read('src/components/admin/centers/content/ContentOverviewLanding.tsx');
const DIRECTORY = read('src/components/admin/centers/content/DirectoryLanding.tsx');
const SHOWCASE = read('src/components/admin/centers/content/ShowcaseCombined.tsx');
const HOME = read('src/components/admin/centers/content/HomeContentCombined.tsx');
const ASSETS = read('src/components/admin/centers/content/AssetsCombined.tsx');
const SUBTABS = read('src/components/admin/centers/content/ContentSubTabs.tsx');

const SHELL_FILES: ReadonlyArray<{ name: string; src: string }> = [
  { name: 'AdminContentCenter.tsx', src: CENTER },
  { name: 'ContentOverviewLanding.tsx', src: OVERVIEW },
  { name: 'DirectoryLanding.tsx', src: DIRECTORY },
  { name: 'ShowcaseCombined.tsx', src: SHOWCASE },
  { name: 'HomeContentCombined.tsx', src: HOME },
  { name: 'AssetsCombined.tsx', src: ASSETS },
  { name: 'ContentSubTabs.tsx', src: SUBTABS },
];

const REQUIRED_TAB_KEYS = [
  'overview',
  'directory',
  'brands',
  'brand-requests',
  'showcase',
  'home',
  'private-sectors',
  'seo',
  'assets',
  'taxonomy',
] as const;

const LEGACY_ROUTES = [
  '/admin/content',
  '/admin/brands',
  '/admin/brands/:id',
  '/admin/brand-requests',
  '/admin/showcase',
  '/admin/partner-showcase',
  '/admin/home-sectors',
  '/admin/home-faq',
  '/admin/private-sectors',
  '/admin/sitemap-status',
  '/admin/site-audit',
  '/admin/sector-seo',
  '/admin/assets',
  '/admin/assets/overrides',
  '/admin/taxonomy',
] as const;

describe('PHASE 6 — Content & Directory Center shell shape', () => {
  it('/admin/content uses AdminContentCenter (TabbedShell-based)', () => {
    expect(APP).toMatch(/path="\/admin\/content"[^\n]*<AdminContentCenter\s*\/>/);
    expect(CENTER).toContain('TabbedShell');
  });

  it('exposes all required canonical tabs', () => {
    for (const key of REQUIRED_TAB_KEYS) {
      expect(CENTER, `missing tab key "${key}"`).toMatch(new RegExp(`key:\\s*'${key}'`));
    }
  });
});

describe('PHASE 6 — legacy routes preserved (no deletions)', () => {
  for (const route of LEGACY_ROUTES) {
    it(`route ${route} is still registered`, () => {
      expect(APP, `missing route ${route}`).toContain(`path="${route}"`);
    });
  }
});

describe('PHASE 6 — shell purity (no query/mutation/service leakage)', () => {
  const FORBIDDEN_IMPORTS = [
    '@/integrations/supabase/client',
    '@tanstack/react-query',
    '@/services/',
    '@/modules/businessService',
    '@/features/private-sectors/service',
  ];

  for (const { name, src } of SHELL_FILES) {
    it(`${name} contains no forbidden service/query imports`, () => {
      for (const needle of FORBIDDEN_IMPORTS) {
        expect(src, `${name} imports ${needle}`).not.toContain(needle);
      }
    });

    it(`${name} does not run queries / mutations`, () => {
      expect(src).not.toMatch(/\buseQuery\b/);
      expect(src).not.toMatch(/\buseMutation\b/);
      expect(src).not.toMatch(/\buseQueryClient\b/);
      expect(src).not.toMatch(/\.rpc\(/);
    });

    it(`${name} contains no hardcoded hex colors`, () => {
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });

    it(`${name} contains no any / suppressions`, () => {
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/\bas\s+any\b/);
      expect(src).not.toMatch(/@ts-ignore/);
      expect(src).not.toMatch(/@ts-expect-error/);
      expect(src).not.toMatch(/eslint-disable/);
    });
  }
});

describe('PHASE 6 — sensitive content surfaces untouched', () => {
  it('private-sectors service module is not referenced from the shell', () => {
    for (const { name, src } of SHELL_FILES) {
      expect(src, `${name} touches private-sectors service`).not.toMatch(
        /features\/private-sectors\/service/,
      );
    }
  });

  it('shell does not import BusinessVisibilityEditor or PublishReadinessPanel', () => {
    for (const { name, src } of SHELL_FILES) {
      expect(src, `${name} imports BusinessVisibilityEditor`).not.toMatch(/BusinessVisibilityEditor/);
      expect(src, `${name} imports PublishReadinessPanel`).not.toMatch(/PublishReadinessPanel/);
      expect(src, `${name} touches HOME_ALLOWED_SLUGS`).not.toMatch(/HOME_ALLOWED_SLUGS/);
      expect(src, `${name} touches computePublicVisibility`).not.toMatch(/computePublicVisibility/);
      expect(src, `${name} touches computeReadiness`).not.toMatch(/computeReadiness/);
    }
  });

  it('SEO tab routes to AdminSeoHub (no inline sitemap/canonical logic)', () => {
    expect(CENTER).toMatch(/AdminSeoHub/);
  });
});