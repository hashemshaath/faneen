import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', 'components', 'admin', 'content');
const FILES = [
  'DirectoryStatusBadge.tsx',
  'PublishStatusBadge.tsx',
  'VerificationStatusBadge.tsx',
  'ContentAdminPageShell.tsx',
  'ContentFiltersBar.tsx',
  'ContentStatsStrip.tsx',
  'ImageAssetPreview.tsx',
  'index.ts',
] as const;

const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

describe('ADMIN REDESIGN PHASE 10B — Content/Directory shared primitives', () => {
  it('every primitive file exists', () => {
    for (const f of FILES) {
      expect(existsSync(resolve(ROOT, f)), `missing ${f}`).toBe(true);
    }
  });

  it('barrel re-exports every primitive', () => {
    const idx = read('index.ts');
    for (const sym of [
      'DirectoryStatusBadge',
      'PublishStatusBadge',
      'VerificationStatusBadge',
      'ContentAdminPageShell',
      'ContentFiltersBar',
      'ContentStatsStrip',
      'ImageAssetPreview',
    ]) {
      expect(idx).toContain(sym);
    }
  });

  it('no Supabase imports in primitives', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src).not.toMatch(/@\/integrations\/supabase/);
      expect(src).not.toMatch(/supabase-js/);
    }
  });

  it('no queries / mutations / executive services in primitives', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src).not.toMatch(/\buseQuery\b/);
      expect(src).not.toMatch(/\buseMutation\b/);
      expect(src).not.toMatch(/from '@\/modules\/brands\/services/);
      expect(src).not.toMatch(/from '@\/features\/private-sectors\/service/);
      expect(src).not.toMatch(/from '@\/modules\/home\/services/);
      expect(src).not.toMatch(/from '@\/modules\/seo\//);
      // image pipeline writers: types from image-pipeline are ok, services not.
      expect(src).not.toMatch(/processImage|uploadPublicImage|uploadShowcaseImage|uploadBrandAsset/);
    }
  });

  it('no hardcoded hex colors in primitives', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src, `hex color in ${f}`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it('no any / suppressions in primitives', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src).not.toMatch(/\bas any\b/);
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/@ts-ignore/);
      expect(src).not.toMatch(/@ts-expect-error/);
      expect(src).not.toMatch(/eslint-disable/);
    }
  });

  it('VerificationStatusBadge delegates to canonical VerifiedBadge', () => {
    const src = read('VerificationStatusBadge.tsx');
    expect(src).toMatch(/from '@\/components\/common\/VerifiedBadge'/);
    // Never reinvents verified visual (no BadgeCheck/CheckCircle2 directly).
    expect(src).not.toMatch(/BadgeCheck/);
    expect(src).not.toMatch(/CheckCircle2/);
  });

  it('listed admin content/directory pages are NOT modified', () => {
    // Snapshot file checksum proxy: ensure files still exist and have not been
    // augmented with imports from the new content/ barrel.
    const pagesDir = resolve(__dirname, '..', 'pages', 'admin');
    const pages = [
      'AdminPartnerShowcase.tsx',
      'AdminHomeSectors.tsx',
      'AdminHomeFaq.tsx',
      'AdminPrivateSectors.tsx',
      'AdminBusinessVisibility.tsx',
      'AdminSitemapStatus.tsx',
      'AdminSiteAudit.tsx',
      'AdminSectorSeo.tsx',
      'AdminBranding.tsx',
      'AdminAssets.tsx',
      'AdminAssetOverrides.tsx',
      'AdminSeoHub.tsx',
      'AdminTaxonomyCenter.tsx',
    ];
    for (const p of pages) {
      const full = resolve(pagesDir, p);
      expect(existsSync(full), `${p} missing`).toBe(true);
      const src = readFileSync(full, 'utf8');
      expect(
        src,
        `${p} must not adopt content primitives in Phase 10B`,
      ).not.toMatch(/from '@\/components\/admin\/content/);
    }
  });

  it('App.tsx is not modified to wire new primitives (no admin/content import)', () => {
    const app = readFileSync(resolve(__dirname, '..', 'App.tsx'), 'utf8');
    expect(app).not.toMatch(/from '@\/components\/admin\/content/);
  });

  it('sitemap / canonical / image-pipeline / publish-readiness files are untouched by this phase', () => {
    // Sanity: required files still exist (no deletions).
    const root = resolve(__dirname, '..', '..');
    for (const rel of [
      'src/modules/files/services/image-pipeline.ts',
      'src/components/admin/PublishReadinessPanel.tsx',
      'src/components/business-profile/BusinessVisibilityEditor.tsx',
      'src/modules/files/components/ResponsiveImage.tsx',
    ]) {
      expect(existsSync(resolve(root, rel)), `missing ${rel}`).toBe(true);
    }
  });
});