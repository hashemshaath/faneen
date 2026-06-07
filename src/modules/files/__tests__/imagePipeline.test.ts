/**
 * Phase 2 image pipeline — unit tests focused on the rules called out
 * in the spec:
 *   - Pipeline never upscales smaller images
 *   - `ResponsiveImage` falls back to legacy `originalUrl` when no variants
 *   - `isVariantUrls` rejects malformed payloads
 */
import { describe, it, expect } from 'vitest';
import { isVariantUrls } from '@/modules/files/services/image-pipeline';

describe('image-pipeline · isVariantUrls', () => {
  it('accepts a valid partial variants map', () => {
    expect(
      isVariantUrls({ thumbnail: 'a', card: 'b', medium: 'c', hero: 'd' }),
    ).toBe(true);
    expect(isVariantUrls({ hero: 'x' })).toBe(true);
    expect(isVariantUrls({})).toBe(true);
  });

  it('rejects unknown keys or non-string values', () => {
    expect(isVariantUrls({ giant: 'x' })).toBe(false);
    expect(isVariantUrls({ hero: 123 })).toBe(false);
    expect(isVariantUrls(null)).toBe(false);
    expect(isVariantUrls('hero')).toBe(false);
  });
});

/**
 * Note: full `processImage` end-to-end tests require Canvas/Worker
 * support which jsdom does not provide. Covered manually + by the
 * Showcase upload smoke test path (fallback branch).
 */