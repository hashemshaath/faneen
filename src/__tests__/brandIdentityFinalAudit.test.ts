import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * BRAND-IDENTITY-FINAL-AUDIT-1 guard.
 *
 * Locks the Qitaat browser/PWA identity contract:
 *   - index.html ships the approved brand color (#0E9E6F) as theme-color
 *   - index.html references the PWA manifest and Apple/Microsoft app metas
 *   - public/manifest.webmanifest exists and carries the Qitaat name + icons
 *   - no user-facing legacy Faneen brand name in index.html or the manifest
 */

const root = resolve(__dirname, '../..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');

describe('BRAND-IDENTITY-FINAL-AUDIT-1: browser & PWA identity', () => {
  it('index.html declares the approved Qitaat theme color (#0E9E6F)', () => {
    expect(html).toMatch(/<meta\s+name="theme-color"\s+content="#0E9E6F"/i);
    expect(html).toMatch(/<meta\s+name="msapplication-TileColor"\s+content="#0E9E6F"/i);
  });

  it('index.html references the PWA manifest and app identity metas', () => {
    expect(html).toMatch(/<link\s+rel="manifest"\s+href="\/manifest\.webmanifest"/i);
    expect(html).toMatch(/<meta\s+name="application-name"\s+content="قِطاعات Qitaat"/);
    expect(html).toMatch(/<meta\s+name="apple-mobile-web-app-title"/i);
    expect(html).toMatch(/<meta\s+name="apple-mobile-web-app-capable"\s+content="yes"/i);
  });

  it('index.html keeps the Qitaat OG/Twitter site identity', () => {
    expect(html).toMatch(/og:site_name"\s+content="قِطاعات Qitaat"/);
    expect(html).toMatch(/<link\s+rel="canonical"\s+href="https:\/\/qitaat\.com\/"/);
  });

  it('index.html has no user-facing legacy Faneen brand name', () => {
    expect(html).not.toMatch(/faneen|فنيين/i);
  });

  it('public/manifest.webmanifest exists and matches Qitaat identity', () => {
    const p = resolve(root, 'public/manifest.webmanifest');
    expect(existsSync(p)).toBe(true);
    const manifest = JSON.parse(readFileSync(p, 'utf8'));
    expect(manifest.name).toBe('قِطاعات Qitaat');
    expect(manifest.short_name).toBe('قِطاعات');
    expect(manifest.theme_color?.toUpperCase()).toBe('#0E9E6F');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.dir).toBe('rtl');
    expect(manifest.lang).toBe('ar');
    expect(Array.isArray(manifest.icons)).toBe(true);
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    // No legacy brand name leakage
    expect(JSON.stringify(manifest)).not.toMatch(/faneen|فنيين/i);
  });
});