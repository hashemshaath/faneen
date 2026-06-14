/**
 * Phase 2.3 — Catalog (service + product) image pipeline guardrails.
 *
 * Mirrors the Phase 2.1/2.2 static checks. Verifies the catalog
 * pipeline + display wiring without executing Canvas/Worker code.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

describe('Phase 2.3 — Catalog image pipeline integration', () => {
  it('exposes uploadServiceImage + uploadProductImage with never-throws fallback', () => {
    const src = read('src/modules/files/domain/catalog.ts');
    expect(src).toContain('processImage');
    expect(src).toContain('image_assets');
    expect(src).toContain('BUSINESS_ASSETS_BUCKET');
    expect(src).toContain('fallback: true');
    expect(src).toContain("cacheControl: '31536000, immutable'");
    expect(src).toContain('validateImage');
    expect(src).toContain('error: new Error');
    expect(src).toContain('uploadServiceImage');
    expect(src).toContain('uploadProductImage');
  });

  it('module index re-exports the catalog helpers', () => {
    const idx = read('src/modules/files/index.ts');
    expect(idx).toContain('uploadServiceImage');
    expect(idx).toContain('uploadProductImage');
    // Articles intentionally still out of scope.
    expect(idx).not.toMatch(/uploadArticleImage\b/);
  });

  it('ImageUpload supports pipeline="service" and pipeline="product"', () => {
    const src = read('src/components/ui/image-upload.tsx');
    expect(src).toContain("pipeline === 'service'");
    expect(src).toContain("pipeline === 'product'");
    expect(src).toContain('uploadServiceImage');
    expect(src).toContain('uploadProductImage');
    // Legacy path preserved.
    expect(src).toContain('compressImage');
    expect(src).toContain('uploadPublicImage');
  });

  it('AdminBrandDetail wires the product pipeline + persists asset link columns', () => {
    // Phase 9G extracted the equivalence/products UI into a panel; the page
    // still owns state + mutations, while the panel renders the upload +
    // responsive image. Assert across both files.
    const page = read('src/pages/admin/AdminBrandDetail.tsx');
    const panel = read('src/components/admin/procurement/brand-detail/BrandEquivalencePanel.tsx');
    expect(page).toContain('image_asset_id');
    expect(page).toContain('image_variants');
    expect(panel).toContain('pipeline="product"');
    expect(panel).toContain('ResponsiveImage');
    // Fallback to legacy URL for old rows.
    expect(panel).toContain('originalUrl={p.image_url}');
  });
});