import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const PARTNER_DIR = resolve(
  __dirname, '..', 'components', 'admin', 'content', 'partner-showcase',
);
const PAGE = resolve(__dirname, '..', 'pages', 'admin', 'AdminPartnerShowcase.tsx');
const APP = resolve(__dirname, '..', 'App.tsx');

const readPartner = (file: string) =>
  readFileSync(resolve(PARTNER_DIR, file), 'utf8');

const ALL_PARTNER_FILES = [
  'PartnerShowcaseStatsSection.tsx',
  'PartnerShowcaseEditorPanel.tsx',
  'PartnerShowcaseAddPanel.tsx',
  'PartnerShowcaseListSection.tsx',
  'PartnerShowcaseRow.tsx',
  'PartnerShowcaseRowActions.tsx',
  'index.ts',
];

describe('Phase 10F — Partner Showcase panels extraction', () => {
  it('1. PartnerShowcaseStatsSection exists', () => {
    expect(existsSync(resolve(PARTNER_DIR, 'PartnerShowcaseStatsSection.tsx'))).toBe(true);
    expect(readPartner('PartnerShowcaseStatsSection.tsx'))
      .toMatch(/export const PartnerShowcaseStatsSection/);
  });

  it('2. PartnerShowcaseFiltersBar — created only if exported (conditional)', () => {
    const indexSrc = readPartner('index.ts');
    const hasFilters = /PartnerShowcaseFiltersBar/.test(indexSrc);
    if (hasFilters) {
      expect(existsSync(resolve(PARTNER_DIR, 'PartnerShowcaseFiltersBar.tsx'))).toBe(true);
    } else {
      expect(hasFilters).toBe(false);
    }
  });

  it('3. PartnerShowcaseListSection exists', () => {
    expect(existsSync(resolve(PARTNER_DIR, 'PartnerShowcaseListSection.tsx'))).toBe(true);
    expect(readPartner('PartnerShowcaseListSection.tsx'))
      .toMatch(/export const PartnerShowcaseListSection/);
  });

  it('4. PartnerShowcaseRow exists', () => {
    expect(existsSync(resolve(PARTNER_DIR, 'PartnerShowcaseRow.tsx'))).toBe(true);
    expect(readPartner('PartnerShowcaseRow.tsx'))
      .toMatch(/export const PartnerShowcaseRow/);
  });

  it('5. PartnerShowcaseRowActions exists', () => {
    expect(existsSync(resolve(PARTNER_DIR, 'PartnerShowcaseRowActions.tsx'))).toBe(true);
    expect(readPartner('PartnerShowcaseRowActions.tsx'))
      .toMatch(/export const PartnerShowcaseRowActions/);
  });

  it('6. AdminPartnerShowcase uses the new sections', () => {
    const src = readFileSync(PAGE, 'utf8');
    expect(src).toMatch(/from '@\/components\/admin\/content\/partner-showcase'/);
    for (const sym of [
      'PartnerShowcaseStatsSection',
      'PartnerShowcaseEditorPanel',
      'PartnerShowcaseAddPanel',
      'PartnerShowcaseListSection',
    ]) {
      expect(src.includes(`<${sym}`)).toBe(true);
    }
  });

  it('7. partner-showcase components do not import Supabase', () => {
    for (const f of ALL_PARTNER_FILES) {
      const src = readPartner(f);
      expect(src, `${f} must not import supabase`).not.toMatch(/integrations\/supabase/);
      expect(src, `${f} must not import supabase`).not.toMatch(/from 'supabase/);
    }
  });

  it('8. partner-showcase components contain no queries or mutations', () => {
    for (const f of ALL_PARTNER_FILES) {
      const src = readPartner(f);
      expect(src, `${f} must not call useQuery`).not.toMatch(/\buseQuery\b/);
      expect(src, `${f} must not call useMutation`).not.toMatch(/\buseMutation\b/);
      expect(src, `${f} must not call useQueryClient`).not.toMatch(/\buseQueryClient\b/);
    }
  });

  it('9. partner-showcase components do not import executive services', () => {
    const forbidden = [
      /modules\/brands\/services/,
      /modules\/files\/services\/image-pipeline/,
      /modules\/seo\//,
      /modules\/home\/services/,
      /features\/private-sectors\/service/,
    ];
    for (const f of ALL_PARTNER_FILES) {
      const src = readPartner(f);
      for (const re of forbidden) {
        expect(src, `${f} imports forbidden ${re}`).not.toMatch(re);
      }
    }
  });

  it('10. no hardcoded hex colors in partner-showcase components', () => {
    for (const f of ALL_PARTNER_FILES) {
      const src = readPartner(f);
      expect(src, `${f} contains hardcoded hex color`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it('11. no any / as any / ts-ignore / ts-expect-error / eslint-disable', () => {
    const targets = [PAGE, ...ALL_PARTNER_FILES.map((f) => resolve(PARTNER_DIR, f))];
    for (const path of targets) {
      const src = readFileSync(path, 'utf8');
      expect(src, `${path} uses :any`).not.toMatch(/:\s*any\b/);
      expect(src, `${path} uses as any`).not.toMatch(/\bas\s+any\b/);
      expect(src, `${path} uses ts-ignore`).not.toMatch(/@ts-ignore/);
      expect(src, `${path} uses ts-expect-error`).not.toMatch(/@ts-expect-error/);
      expect(src, `${path} uses eslint-disable`).not.toMatch(/eslint-disable/);
    }
  });

  it('12. App.tsx routes are not modified to add partner-showcase wiring', () => {
    const app = readFileSync(APP, 'utf8');
    expect(app).not.toMatch(/from '@\/components\/admin\/content\/partner-showcase/);
  });

  it('13. forbidden modules/libs are not touched (files still exist)', () => {
    const forbiddenPaths = [
      'src/modules/files/services/image-pipeline.ts',
      'src/modules/home/services',
      'src/features/private-sectors/service.ts',
      'scripts/generate-sitemap.ts',
    ];
    for (const rel of forbiddenPaths) {
      expect(existsSync(resolve(ROOT, rel)), `missing ${rel}`).toBe(true);
    }
  });

  it('14. sitemap / canonical / publish-readiness files untouched (exist)', () => {
    for (const rel of [
      'src/components/admin/PublishReadinessPanel.tsx',
      'src/components/business-profile/BusinessVisibilityEditor.tsx',
      'src/modules/files/components/ResponsiveImage.tsx',
    ]) {
      expect(existsSync(resolve(ROOT, rel)), `missing ${rel}`).toBe(true);
    }
  });
});