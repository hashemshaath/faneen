import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * PUBLIC-ASSETS-AUDIT-1 guard.
 *
 * Audit concluded zero orphans in public/. Every file is either:
 *   - an SEO/crawler manifest (robots, sitemap, llms)
 *   - an icon/PWA asset referenced by index.html
 *   - an OG/social or logo asset referenced by src/ meta helpers
 *   - a verification file requested directly by an external service
 *     (Google Search Console, IndexNow, Bing)
 *   - a deployment header file (_headers)
 *   - placeholder.svg (kept as unsure; Lovable default)
 *
 * This test locks that contract so future cleanups don't accidentally
 * remove a file an external service still requests.
 */

const REQUIRED_PUBLIC_FILES = [
  'robots.txt',
  'sitemap.xml',
  'llms.txt',
  '_headers',
  'favicon.ico',
  'pwa-192.png',
  'pwa-512.png',
  'og-image.jpg',
  'logo.png',
  'placeholder.svg',
  // Google Search Console verification
  'googled1e09a6f0ff15d8e.html',
  // IndexNow keys (filename === key contents, requested verbatim by Bing/IndexNow)
  'indexnow-key.txt',
  '2d03c06eed08075d8a474a6d7a63962b.txt',
] as const;

const root = resolve(__dirname, '../..');

describe('PUBLIC-ASSETS-AUDIT-1: public/ asset integrity', () => {
  it.each(REQUIRED_PUBLIC_FILES)('preserves required public/%s', (name) => {
    expect(existsSync(resolve(root, 'public', name))).toBe(true);
  });

  it('index.html still references the favicon and PWA icons that live in public/', () => {
    const html = readFileSync(resolve(root, 'index.html'), 'utf8');
    expect(html).toMatch(/href="\/favicon\.ico"/);
    expect(html).toMatch(/href="\/pwa-192\.png"/);
    expect(html).toMatch(/apple-touch-icon/);
    expect(html).toMatch(/og-image\.jpg/);
  });

  it('does not introduce references to deleted/never-existed public assets', () => {
    // Sanity guard: if a future change adds a reference to one of these
    // names, we want to know — they were considered and rejected.
    const html = readFileSync(resolve(root, 'index.html'), 'utf8');
    expect(html).not.toMatch(/\/hero-bg\.(webp|jpg)/);
  });
});