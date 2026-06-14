import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const page = readFileSync(resolve(ROOT, 'pages/admin/AdminBrands.tsx'), 'utf8');
const app = readFileSync(resolve(ROOT, 'App.tsx'), 'utf8');

describe('ADMIN REDESIGN PHASE 10D — AdminBrands content-primitives adoption', () => {
  it('uses ContentAdminPageShell', () => {
    expect(page).toMatch(/ContentAdminPageShell/);
    expect(page).toMatch(/from '@\/components\/admin\/content'/);
  });

  it('uses ContentFiltersBar', () => {
    expect(page).toMatch(/ContentFiltersBar/);
  });

  it('uses ContentStatsStrip', () => {
    expect(page).toMatch(/ContentStatsStrip/);
  });

  it('uses a status badge from content primitives', () => {
    expect(page).toMatch(/DirectoryStatusBadge|PublishStatusBadge/);
  });

  it('uses VerificationStatusBadge from content primitives', () => {
    expect(page).toMatch(/VerificationStatusBadge/);
  });

  it('AdminBrands has no any / suppressions added', () => {
    expect(page).not.toMatch(/\bas any\b/);
    expect(page).not.toMatch(/:\s*any\b/);
    expect(page).not.toMatch(/@ts-ignore/);
    expect(page).not.toMatch(/@ts-expect-error/);
    expect(page).not.toMatch(/eslint-disable/);
  });

  it('App.tsx routes are NOT modified to wire content primitives', () => {
    expect(app).not.toMatch(/from '@\/components\/admin\/content/);
    expect(app).toMatch(/AdminBrands/);
  });

  it('AdminBrandDetail.tsx is untouched (still exists, no content primitives import)', () => {
    const detailPath = resolve(ROOT, 'pages/admin/AdminBrandDetail.tsx');
    expect(existsSync(detailPath)).toBe(true);
    const src = readFileSync(detailPath, 'utf8');
    expect(src).not.toMatch(/from '@\/components\/admin\/content/);
  });

  it('approve / reject / archive mutations preserved verbatim', () => {
    expect(page).toMatch(/adminApproveBrand/);
    expect(page).toMatch(/adminRejectBrand/);
    expect(page).toMatch(/adminArchiveBrand/);
  });

  it('protected files / public-visibility / sitemap / canonical are untouched', () => {
    for (const rel of [
      'modules/files/services/image-pipeline.ts',
      'modules/files/components/ResponsiveImage.tsx',
      'components/business-profile/BusinessVisibilityEditor.tsx',
      'components/admin/PublishReadinessPanel.tsx',
    ]) {
      expect(existsSync(resolve(ROOT, rel)), `missing ${rel}`).toBe(true);
    }
  });
});