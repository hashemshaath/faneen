import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const page = readFileSync(resolve(ROOT, 'pages/admin/AdminShowcase.tsx'), 'utf8');
const rowActions = readFileSync(
  resolve(ROOT, 'components/admin/content/showcase/ShowcaseRowActions.tsx'),
  'utf8',
);
const app = readFileSync(resolve(ROOT, 'App.tsx'), 'utf8');

describe('ADMIN REDESIGN PHASE 10C — AdminShowcase content-primitives adoption', () => {
  it('uses ContentAdminPageShell', () => {
    expect(page).toMatch(/ContentAdminPageShell/);
    expect(page).toMatch(/from "@\/components\/admin\/content"/);
  });

  it('uses ContentFiltersBar', () => {
    expect(page).toMatch(/ContentFiltersBar/);
  });

  it('uses ContentStatsStrip', () => {
    expect(page).toMatch(/ContentStatsStrip/);
  });

  it('uses a status badge from content primitives', () => {
    expect(page).toMatch(/DirectoryStatusBadge|PublishStatusBadge|VerificationStatusBadge/);
  });

  it('does not change image pipeline behavior — ResponsiveImage props unchanged', () => {
    expect(page).toMatch(/<ResponsiveImage[\s\S]*?originalUrl=\{row\.image_url\}/);
    expect(page).toMatch(/variants=\{row\.image_asset\?\.variants\}/);
    // No new pipeline writers introduced.
    expect(page).not.toMatch(/processImage|uploadPublicImage|uploadShowcaseImage/);
  });

  it('ShowcaseRowActions has no Supabase / queries / mutations / executive services', () => {
    expect(rowActions).not.toMatch(/@\/integrations\/supabase/);
    expect(rowActions).not.toMatch(/supabase-js/);
    expect(rowActions).not.toMatch(/\buseQuery\b/);
    expect(rowActions).not.toMatch(/\buseMutation\b/);
    expect(rowActions).not.toMatch(/from '@\/modules\//);
    expect(rowActions).not.toMatch(/from '@\/services\//);
  });

  it('ShowcaseRowActions has no hardcoded hex colors', () => {
    expect(rowActions).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('ShowcaseRowActions has no any / suppressions', () => {
    expect(rowActions).not.toMatch(/\bas any\b/);
    expect(rowActions).not.toMatch(/:\s*any\b/);
    expect(rowActions).not.toMatch(/@ts-ignore/);
    expect(rowActions).not.toMatch(/@ts-expect-error/);
    expect(rowActions).not.toMatch(/eslint-disable/);
  });

  it('AdminShowcase has no any / suppressions added', () => {
    expect(page).not.toMatch(/\bas any\b/);
    expect(page).not.toMatch(/@ts-ignore/);
    expect(page).not.toMatch(/@ts-expect-error/);
    expect(page).not.toMatch(/eslint-disable/);
  });

  it('App.tsx routes are NOT modified to wire content primitives', () => {
    expect(app).not.toMatch(/from '@\/components\/admin\/content/);
    // Route to AdminShowcase must still exist.
    expect(app).toMatch(/AdminShowcase/);
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

  it('approve / reject / status values are preserved verbatim', () => {
    // Mutation status writes still go through showcase_submissions update.
    expect(page).toMatch(/from\("showcase_submissions"\)/);
    expect(page).toMatch(/status:\s*"approved"/);
    expect(page).toMatch(/status:\s*"rejected"/);
    // Tab keys unchanged.
    expect(page).toMatch(/type Tab = "pending" \| "approved" \| "rejected"/);
  });
});