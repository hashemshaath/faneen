import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const DIR = resolve(__dirname, '..', 'components', 'admin', 'content', 'home');
const SECTORS_PAGE = resolve(__dirname, '..', 'pages', 'admin', 'AdminHomeSectors.tsx');
const FAQ_PAGE = resolve(__dirname, '..', 'pages', 'admin', 'AdminHomeFaq.tsx');
const APP = resolve(__dirname, '..', 'App.tsx');

const FILES = [
  'HomeContentRowActions.tsx',
  'HomeSectorsStatsSection.tsx',
  'HomeSectorRow.tsx',
  'HomeSectorsListSection.tsx',
  'HomeFaqStatsSection.tsx',
  'HomeFaqRow.tsx',
  'HomeFaqListSection.tsx',
  'HomeFaqEditForm.tsx',
  'index.ts',
];

const read = (rel: string) => readFileSync(resolve(DIR, rel), 'utf8');

describe('Phase 10I — Home content panels extraction', () => {
  it('1-7. all home content panel components exist', () => {
    for (const f of [
      'HomeSectorsStatsSection.tsx',
      'HomeSectorsListSection.tsx',
      'HomeSectorRow.tsx',
      'HomeContentRowActions.tsx',
      'HomeFaqStatsSection.tsx',
      'HomeFaqListSection.tsx',
      'HomeFaqRow.tsx',
    ]) {
      expect(existsSync(resolve(DIR, f)), `${f} missing`).toBe(true);
    }
  });

  it('8. home admin pages adopt the new components', () => {
    const sectors = readFileSync(SECTORS_PAGE, 'utf8');
    const faq = readFileSync(FAQ_PAGE, 'utf8');
    expect(sectors).toMatch(/from '@\/components\/admin\/content\/home'/);
    expect(faq).toMatch(/from '@\/components\/admin\/content\/home'/);
    expect(sectors).toMatch(/<HomeSectorsStatsSection/);
    expect(sectors).toMatch(/<HomeSectorsListSection/);
    expect(sectors).toMatch(/<HomeSectorRowCard/);
    expect(faq).toMatch(/<HomeFaqStatsSection/);
    expect(faq).toMatch(/<HomeFaqListSection/);
    expect(faq).toMatch(/<HomeFaqRow/);
  });

  it('9. components do not import Supabase', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src, `${f} imports supabase`).not.toMatch(/integrations\/supabase/);
      expect(src, `${f} imports supabase-js`).not.toMatch(/supabase-js/);
    }
  });

  it('10. no queries or mutations inside components', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src, `${f} useQuery`).not.toMatch(/\buseQuery\b/);
      expect(src, `${f} useMutation`).not.toMatch(/\buseMutation\b/);
      expect(src, `${f} useQueryClient`).not.toMatch(/\buseQueryClient\b/);
    }
  });

  it('11. no imports from executive services', () => {
    const forbidden = [
      /from '@\/modules\/home\/services/,
      /from '@\/modules\/brands\/services/,
      /from '@\/modules\/seo\//,
      /from '@\/features\/private-sectors\/service/,
      /from '@\/modules\/files\/services\/image-pipeline/,
      /useAdminHomeSectors|useAdminHomeFaq|updateHomeSectorOverride|createHomeFaq|updateHomeFaq|deleteHomeFaq/,
    ];
    for (const f of FILES) {
      const src = read(f);
      for (const re of forbidden) {
        expect(src, `${f} matches ${re}`).not.toMatch(re);
      }
    }
  });

  it('12. no hardcoded hex colors in components', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src, `${f} hex color`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it('13. no any / suppressions in components or pages', () => {
    const targets = [...FILES.map((f) => resolve(DIR, f)), SECTORS_PAGE, FAQ_PAGE];
    for (const path of targets) {
      const src = readFileSync(path, 'utf8');
      expect(src, `${path} :any`).not.toMatch(/:\s*any\b/);
      expect(src, `${path} as any`).not.toMatch(/\bas\s+any\b/);
      expect(src, `${path} ts-ignore`).not.toMatch(/@ts-ignore/);
      expect(src, `${path} ts-expect-error`).not.toMatch(/@ts-expect-error/);
      expect(src, `${path} eslint-disable`).not.toMatch(/eslint-disable/);
    }
  });

  it('14. App.tsx is not modified to wire home content sections', () => {
    const app = readFileSync(APP, 'utf8');
    expect(app).not.toMatch(/from '@\/components\/admin\/content\/home/);
  });

  it('15. taxonomy_categories.metadata.home_grid shape files are untouched (presence only)', () => {
    const candidates = [
      'src/modules/home/services',
      'src/modules/home/index.ts',
      'src/components/home/v2/data/homeTaxonomy.ts',
      'src/components/home/v2/sections/HomeSectorGrid.tsx',
    ];
    for (const rel of candidates) {
      expect(existsSync(resolve(ROOT, rel)), `missing ${rel}`).toBe(true);
    }
    for (const f of FILES) {
      const src = read(f);
      expect(src, `${f} references metadata.home_grid`).not.toMatch(/metadata\.home_grid|home_grid/);
      expect(src, `${f} references taxonomy_categories`).not.toMatch(/taxonomy_categories/);
    }
  });

  it('16. HOME_ALLOWED_SLUGS is not referenced by components', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src, `${f} references HOME_ALLOWED_SLUGS`).not.toMatch(/HOME_ALLOWED_SLUGS/);
      expect(src, `${f} references HOME_SECTOR_GRID_SLUGS`).not.toMatch(/HOME_SECTOR_GRID_SLUGS/);
    }
    expect(existsSync(resolve(ROOT, 'src/components/home/v2/data/homeTaxonomy.ts'))).toBe(true);
  });

  it('17. slugs / public visibility / sitemap / image pipeline files are untouched (presence only)', () => {
    for (const rel of [
      'src/modules/files/services/image-pipeline.ts',
      'src/components/admin/PublishReadinessPanel.tsx',
    ]) {
      expect(existsSync(resolve(ROOT, rel)), `missing ${rel}`).toBe(true);
    }
    for (const f of FILES) {
      const src = read(f);
      expect(src, `${f} touches sitemap`).not.toMatch(/sitemap/i);
      expect(src, `${f} touches image pipeline`).not.toMatch(/image-pipeline|processImage|uploadPublicImage|uploadShowcaseImage|uploadBrandAsset/);
    }
  });

  it('parents retain queries and mutations', () => {
    const sectors = readFileSync(SECTORS_PAGE, 'utf8');
    const faq = readFileSync(FAQ_PAGE, 'utf8');
    expect(sectors).toMatch(/useAdminHomeSectors/);
    expect(sectors).toMatch(/useMutation/);
    expect(faq).toMatch(/useAdminHomeFaq/);
    expect(faq).toMatch(/useMutation/);
    expect(faq).toMatch(/createHomeFaq|updateHomeFaq|deleteHomeFaq/);
  });
});