import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const drawerPath = resolve(ROOT, 'components/admin/content/brands/BrandDetailsDrawer.tsx');
const adapterPath = resolve(ROOT, 'components/admin/content/brands/buildBrandDetailsDrawerProps.ts');
const indexPath = resolve(ROOT, 'components/admin/content/brands/index.ts');
const pagePath = resolve(ROOT, 'pages/admin/AdminBrands.tsx');
const appPath = resolve(ROOT, 'App.tsx');
const detailPath = resolve(ROOT, 'pages/admin/AdminBrandDetail.tsx');

const drawer = readFileSync(drawerPath, 'utf8');
const adapter = readFileSync(adapterPath, 'utf8');
const page = readFileSync(pagePath, 'utf8');
const app = readFileSync(appPath, 'utf8');

describe('ADMIN REDESIGN PHASE 10E — Admin Brands details drawer (read-only)', () => {
  it('BrandDetailsDrawer file exists and exports the component', () => {
    expect(existsSync(drawerPath)).toBe(true);
    expect(drawer).toMatch(/export const BrandDetailsDrawer/);
    expect(readFileSync(indexPath, 'utf8')).toMatch(/BrandDetailsDrawer/);
  });

  it('buildBrandDetailsDrawerProps adapter exists and is exported', () => {
    expect(existsSync(adapterPath)).toBe(true);
    expect(adapter).toMatch(/export function buildBrandDetailsDrawerProps/);
  });

  it('adapter is pure: no Supabase, no async, no fetch, no I/O', () => {
    expect(adapter).not.toMatch(/@\/integrations\/supabase/);
    expect(adapter).not.toMatch(/supabase-js/);
    expect(adapter).not.toMatch(/\basync\b/);
    expect(adapter).not.toMatch(/\bawait\b/);
    expect(adapter).not.toMatch(/\bfetch\(/);
    expect(adapter).not.toMatch(/from '@\/modules\/[^']+\/services/);
    expect(adapter).not.toMatch(/from '@\/services\//);
  });

  it('AdminBrands.tsx wires the drawer + preview state', () => {
    expect(page).toMatch(/BrandDetailsDrawer/);
    expect(page).toMatch(/buildBrandDetailsDrawerProps/);
    expect(page).toMatch(/previewId/);
    expect(page).toMatch(/from '@\/components\/admin\/content\/brands'/);
  });

  it('drawer is read-only: no approve/reject/archive/verify mutations inside', () => {
    expect(drawer).not.toMatch(/adminApproveBrand|adminRejectBrand|adminArchiveBrand/);
    expect(drawer).not.toMatch(/\buseMutation\b/);
    expect(drawer).not.toMatch(/\buseQuery\b/);
    expect(adapter).not.toMatch(/adminApproveBrand|adminRejectBrand|adminArchiveBrand/);
    expect(adapter).not.toMatch(/\buseMutation\b/);
    expect(adapter).not.toMatch(/\buseQuery\b/);
  });

  it('new components do not import Supabase', () => {
    for (const src of [drawer, adapter]) {
      expect(src).not.toMatch(/@\/integrations\/supabase/);
      expect(src).not.toMatch(/supabase-js/);
    }
  });

  it('new components do not import executive services', () => {
    for (const src of [drawer, adapter]) {
      expect(src).not.toMatch(/from '@\/modules\/brands\/services/);
      expect(src).not.toMatch(/from '@\/modules\/files\/services\/image-pipeline/);
      expect(src).not.toMatch(/from '@\/modules\/seo\//);
      expect(src).not.toMatch(/from '@\/modules\/home\/services/);
      expect(src).not.toMatch(/from '@\/features\/private-sectors\/service/);
    }
  });

  it('no hardcoded hex colors in new components', () => {
    for (const src of [drawer, adapter]) {
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it('no any / suppressions in new components', () => {
    for (const src of [drawer, adapter]) {
      expect(src).not.toMatch(/\bas any\b/);
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/@ts-ignore/);
      expect(src).not.toMatch(/@ts-expect-error/);
      expect(src).not.toMatch(/eslint-disable/);
    }
  });

  it('App.tsx routes not modified to wire content primitives', () => {
    expect(app).not.toMatch(/from '@\/components\/admin\/content/);
    expect(app).toMatch(/AdminBrands/);
  });

  it('AdminBrandDetail.tsx untouched (no content primitives import)', () => {
    expect(existsSync(detailPath)).toBe(true);
    const src = readFileSync(detailPath, 'utf8');
    expect(src).not.toMatch(/from '@\/components\/admin\/content/);
  });

  it('forbidden modules / public visibility / sitemap / canonical files untouched (still exist)', () => {
    for (const rel of [
      'modules/brands/services/brandsService.ts',
      'modules/files/services/image-pipeline.ts',
      'modules/files/components/ResponsiveImage.tsx',
      'components/business-profile/BusinessVisibilityEditor.tsx',
      'components/admin/PublishReadinessPanel.tsx',
    ]) {
      expect(existsSync(resolve(ROOT, rel)), `missing ${rel}`).toBe(true);
    }
  });

  it('brand mutations preserved verbatim in page', () => {
    expect(page).toMatch(/adminApproveBrand/);
    expect(page).toMatch(/adminRejectBrand/);
    expect(page).toMatch(/adminArchiveBrand/);
  });
});