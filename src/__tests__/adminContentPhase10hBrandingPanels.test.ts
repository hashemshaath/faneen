import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const DIR = resolve(__dirname, '..', 'components', 'admin', 'content', 'branding');
const PAGE = resolve(__dirname, '..', 'pages', 'admin', 'AdminBranding.tsx');
const APP = resolve(__dirname, '..', 'App.tsx');

const FILES = [
  'BrandingOverviewSection.tsx',
  'BrandingActionsPanel.tsx',
  'BrandingLogoAssetsSection.tsx',
  'BrandingSizesSection.tsx',
  'BrandingColorTokensSection.tsx',
  'BrandingPreviewSection.tsx',
  'BrandingLivePreviewSection.tsx',
  'brandingConstants.ts',
  'types.ts',
  'index.ts',
];

const read = (rel: string) => readFileSync(resolve(DIR, rel), 'utf8');

describe('Phase 10H — Admin Branding panels extraction', () => {
  it('1-6. all branding panel components exist', () => {
    for (const f of [
      'BrandingOverviewSection.tsx',
      'BrandingLogoAssetsSection.tsx',
      'BrandingColorTokensSection.tsx',
      'BrandingPreviewSection.tsx',
      'BrandingActionsPanel.tsx',
    ]) {
      expect(existsSync(resolve(DIR, f)), `${f} missing`).toBe(true);
    }
  });

  it('7. AdminBranding.tsx adopts the new components', () => {
    const src = readFileSync(PAGE, 'utf8');
    expect(src).toMatch(/from '@\/components\/admin\/content\/branding'/);
    for (const tag of [
      'BrandingOverviewSection',
      'BrandingActionsPanel',
      'BrandingLogoAssetsSection',
      'BrandingColorTokensSection',
      'BrandingPreviewSection',
      'BrandingLivePreviewSection',
      'BrandingSizesSection',
    ]) {
      expect(src, `${tag} not rendered`).toMatch(new RegExp(`<${tag}`));
    }
  });

  it('8. branding components do not import Supabase', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src, `${f} imports supabase`).not.toMatch(/integrations\/supabase/);
      expect(src, `${f} imports supabase-js`).not.toMatch(/supabase-js/);
    }
  });

  it('9. no queries / mutations in branding components', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src, `${f} useQuery`).not.toMatch(/\buseQuery\b/);
      expect(src, `${f} useMutation`).not.toMatch(/\buseMutation\b/);
      expect(src, `${f} useQueryClient`).not.toMatch(/\buseQueryClient\b/);
    }
  });

  it('10. no executive service imports in branding components', () => {
    const forbidden = [
      /from '@\/modules\/brands\/services/,
      /from '@\/modules\/home\/services/,
      /from '@\/modules\/seo\//,
      /from '@\/features\/private-sectors\/service/,
      /from '@\/modules\/files\/services\/image-pipeline/,
      /uploadBrandAsset|uploadPublicImage|uploadShowcaseImage|processImage/,
    ];
    for (const f of FILES) {
      const src = read(f);
      for (const re of forbidden) {
        expect(src, `${f} matches ${re}`).not.toMatch(re);
      }
    }
  });

  it('11. no hardcoded hex colors in branding components', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src, `${f} hex color`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it('12. no any / suppressions in branding components or page', () => {
    const targets = [...FILES.map((f) => resolve(DIR, f)), PAGE];
    for (const path of targets) {
      const src = readFileSync(path, 'utf8');
      expect(src, `${path} :any`).not.toMatch(/:\s*any\b/);
      expect(src, `${path} as any`).not.toMatch(/\bas\s+any\b/);
      expect(src, `${path} ts-ignore`).not.toMatch(/@ts-ignore/);
      expect(src, `${path} ts-expect-error`).not.toMatch(/@ts-expect-error/);
      expect(src, `${path} eslint-disable`).not.toMatch(/eslint-disable/);
    }
  });

  it('13. App.tsx is not modified to wire branding sections', () => {
    const app = readFileSync(APP, 'utf8');
    expect(app).not.toMatch(/from '@\/components\/admin\/content\/branding/);
  });

  it('14. AdminSystemSettings.tsx is untouched (presence only)', () => {
    const path = resolve(__dirname, '..', 'pages', 'admin', 'AdminSystemSettings.tsx');
    if (existsSync(path)) {
      const src = readFileSync(path, 'utf8');
      expect(src).not.toMatch(/from '@\/components\/admin\/content\/branding/);
    }
  });

  it('15. IdentityTokensApplier and ThemeApplier are not imported by branding components', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src, `${f} imports IdentityTokensApplier`).not.toMatch(/IdentityTokensApplier/);
      expect(src, `${f} imports ThemeApplier`).not.toMatch(/ThemeApplier/);
    }
    // Files themselves still exist (not deleted).
    expect(existsSync(resolve(ROOT, 'src/components/IdentityTokensApplier.tsx'))).toBe(true);
    expect(existsSync(resolve(ROOT, 'src/components/ThemeApplier.tsx'))).toBe(true);
  });

  it('16. theme / index.css / brand config files are not imported by branding components in a write-capable way', () => {
    for (const f of FILES) {
      const src = read(f);
      // Reading brand tokens for placeholders is fine; writing CSS vars is not.
      expect(src, `${f} writes to documentElement.style`).not.toMatch(/documentElement\.style/);
      expect(src, `${f} sets CSS variable`).not.toMatch(/setProperty\(\s*['"]--/);
    }
    expect(existsSync(resolve(ROOT, 'src/index.css'))).toBe(true);
  });

  it('17. image pipeline and favicon/browser asset files are untouched (presence only)', () => {
    for (const rel of [
      'src/modules/files/services/image-pipeline.ts',
      'src/modules/files/domain/branding.ts',
      'public/manifest.webmanifest',
    ]) {
      expect(existsSync(resolve(ROOT, rel)), `missing ${rel}`).toBe(true);
    }
    for (const f of FILES) {
      const src = read(f);
      expect(src, `${f} imports favicon/manifest`).not.toMatch(/manifest\.webmanifest|favicon/i);
    }
  });

  it('18. branding components do not reference DB / RLS / migration paths', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src, `${f} hits supabase/migrations`).not.toMatch(/supabase\/migrations/);
      expect(src, `${f} uses platform_settings table`).not.toMatch(/platform_settings/);
      expect(src, `${f} uses rpc()`).not.toMatch(/\.rpc\(/);
    }
  });

  it('parent page retains its queries and mutations', () => {
    const src = readFileSync(PAGE, 'utf8');
    expect(src).toMatch(/useQuery/);
    expect(src).toMatch(/useMutation/);
    expect(src).toMatch(/uploadBrandAsset/);
    expect(src).toMatch(/platform_settings/);
  });
});