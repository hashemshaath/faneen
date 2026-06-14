import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const DIR = resolve(__dirname, '..', 'components', 'admin', 'content', 'private-sectors');
const PAGE = resolve(__dirname, '..', 'pages', 'admin', 'AdminPrivateSectors.tsx');
const APP = resolve(__dirname, '..', 'App.tsx');
const SERVICE = resolve(__dirname, '..', 'features', 'private-sectors', 'service.ts');

const FILES = [
  'PrivateSectorsStatsSection.tsx',
  'PrivateSectorsFiltersBar.tsx',
  'PrivateSectorsListSection.tsx',
  'PrivateSectorRow.tsx',
  'PrivateSectorRowActions.tsx',
  'PrivateSectorAuditPanel.tsx',
  'types.ts',
  'index.ts',
];

const read = (rel: string) => readFileSync(resolve(DIR, rel), 'utf8');

describe('Phase 10J — Private sectors admin panels extraction', () => {
  it('1-4. all panel components exist', () => {
    for (const f of [
      'PrivateSectorsStatsSection.tsx',
      'PrivateSectorsListSection.tsx',
      'PrivateSectorRow.tsx',
      'PrivateSectorAuditPanel.tsx',
    ]) {
      expect(existsSync(resolve(DIR, f)), `${f} missing`).toBe(true);
    }
  });

  it('5. AdminPrivateSectors uses the new components', () => {
    const src = readFileSync(PAGE, 'utf8');
    expect(src).toMatch(/from '@\/components\/admin\/content\/private-sectors'/);
    expect(src).toMatch(/<PrivateSectorsStatsSection/);
    expect(src).toMatch(/<PrivateSectorsFiltersBar/);
    expect(src).toMatch(/<PrivateSectorsListSection/);
    expect(src).toMatch(/<PrivateSectorRow/);
    expect(src).toMatch(/<PrivateSectorAuditPanel/);
  });

  it('6. components do not import Supabase', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src, `${f} imports supabase`).not.toMatch(/integrations\/supabase/);
      expect(src, `${f} imports supabase-js`).not.toMatch(/supabase-js/);
    }
  });

  it('7. no queries or mutations inside components', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src, `${f} useQuery`).not.toMatch(/\buseQuery\b/);
      expect(src, `${f} useMutation`).not.toMatch(/\buseMutation\b/);
      expect(src, `${f} useQueryClient`).not.toMatch(/\buseQueryClient\b/);
    }
  });

  it('8. no imports from executive services', () => {
    const forbidden = [
      /from '@\/features\/private-sectors\/service/,
      /from '@\/modules\/brands\/services/,
      /from '@\/modules\/home\/services/,
      /from '@\/modules\/seo\//,
      /from '@\/modules\/files\/services\/image-pipeline/,
      /\blistAllSectors\b|\breviewSector\b|\bupdateSector\b|\bdeleteSector\b|\bsetSectorReason\b|\blistGlobalAudit\b|\blistAuditForSector\b/,
    ];
    for (const f of FILES) {
      const src = read(f);
      for (const re of forbidden) {
        expect(src, `${f} matches ${re}`).not.toMatch(re);
      }
    }
  });

  it('9. private-sectors service file is untouched (presence + recent mtime guard)', () => {
    expect(existsSync(SERVICE)).toBe(true);
    const pageMtime = statSync(PAGE).mtimeMs;
    const serviceMtime = statSync(SERVICE).mtimeMs;
    // Service must not have been edited after the page in this phase
    expect(serviceMtime).toBeLessThanOrEqual(pageMtime);
  });

  it('10. no hardcoded hex colors in components', () => {
    for (const f of FILES) {
      const src = read(f);
      expect(src, `${f} hex color`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it('11. no any / suppressions in components or page', () => {
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

  it('12. App.tsx is not modified to wire private sectors panels', () => {
    const app = readFileSync(APP, 'utf8');
    expect(app).not.toMatch(/from '@\/components\/admin\/content\/private-sectors/);
  });

  it('13. public visibility / sitemap / canonical / image pipeline files are untouched (presence + no refs)', () => {
    for (const rel of [
      'src/modules/files/services/image-pipeline.ts',
      'src/components/admin/PublishReadinessPanel.tsx',
    ]) {
      expect(existsSync(resolve(ROOT, rel)), `missing ${rel}`).toBe(true);
    }
    for (const f of FILES) {
      const src = read(f);
      expect(src, `${f} touches sitemap`).not.toMatch(/sitemap/i);
      expect(src, `${f} touches canonical`).not.toMatch(/canonical/i);
      expect(src, `${f} touches image pipeline`).not.toMatch(/image-pipeline|processImage|uploadPublicImage|uploadBrandAsset/);
    }
  });

  it('parent retains queries, mutations, and service calls', () => {
    const src = readFileSync(PAGE, 'utf8');
    expect(src).toMatch(/useQuery/);
    expect(src).toMatch(/useMutation/);
    expect(src).toMatch(/listAllSectors/);
    expect(src).toMatch(/reviewSector/);
    expect(src).toMatch(/updateSector/);
    expect(src).toMatch(/deleteSector/);
    expect(src).toMatch(/listGlobalAudit/);
    expect(src).toMatch(/listAuditForSector/);
  });
});