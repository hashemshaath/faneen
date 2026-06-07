/**
 * Phase 2.2 — Business image pipeline static guardrails.
 *
 * Verifies the business pipeline + display wiring without executing
 * Canvas/Worker code (jsdom limitations). Same shape as the project
 * pipeline test.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

describe('Phase 2.2 — Business image pipeline integration', () => {
  it('exposes uploadBusinessImage with logo/cover kinds and never-throws fallback', () => {
    const src = read('src/modules/files/domain/businesses.ts');
    expect(src).toContain('processImage');
    expect(src).toContain('image_assets');
    expect(src).toContain('BUSINESS_ASSETS_BUCKET');
    expect(src).toContain('fallback: true');
    expect(src).toContain("cacheControl: '31536000, immutable'");
    expect(src).toContain('validateImage');
    expect(src).toContain('error: new Error');
    expect(src).toContain('${userId}/business/${kind}/');
  });

  it('ImageUpload supports pipeline="business" opt-in path', () => {
    const src = read('src/components/ui/image-upload.tsx');
    expect(src).toContain("if (pipeline === 'business'");
    expect(src).toContain('uploadBusinessImage');
    expect(src).toContain('businessKind');
    // Legacy path preserved.
    expect(src).toContain('compressImage');
    expect(src).toContain('uploadPublicImage');
  });

  it('DashboardBusinessEdit wires the pipeline + persists asset link columns', () => {
    const src = read('src/pages/dashboard/DashboardBusinessEdit.tsx');
    expect(src).toContain('pipeline="business"');
    expect(src).toContain('businessKind="logo"');
    expect(src).toContain('businessKind="cover"');
    expect(src).toContain('logo_image_asset_id');
    expect(src).toContain('cover_image_asset_id');
    expect(src).toContain('logo_image_variants');
    expect(src).toContain('cover_image_variants');
  });

  it('BusinessCard + BusinessProfileHeader use ResponsiveImage with legacy fallback', () => {
    const card = read('src/components/search/BusinessCard.tsx');
    expect(card).toContain('ResponsiveImage');
    expect(card).toContain('logo_image_variants');
    expect(card).toContain('cover_image_variants');
    expect(card).toContain('originalUrl={b.logo_url}');
    expect(card).toContain('originalUrl={b.cover_url}');

    const header = read('src/components/business-profile/BusinessProfileHeader.tsx');
    expect(header).toContain('ResponsiveImage');
    expect(header).toContain('originalUrl={business.cover_url}');
    expect(header).toContain('originalUrl={business.logo_url}');
    expect(header).toContain('priority');
  });

  it('Phase 2.2 is scoped to businesses — articles untouched', () => {
    const idx = read('src/modules/files/index.ts');
    expect(idx).toContain('uploadBusinessImage');
    // Article upload helper still intentionally absent (Phase 2.4+).
    expect(idx).not.toMatch(/uploadArticleImage\b/);
  });
});