/**
 * SEO-1 — Public-safety contract for the sitemap edge function.
 *
 * Source-level guarantees we want to lock in:
 *  - businesses sitemap must match the `businesses_public` view filters
 *    (active + published + non-demo) so pending / rejected / draft /
 *    demo providers never surface in the sitemap.
 *  - brands sitemap must source from the `brands_public` view
 *    (approved-only) — never the raw `brand_catalog` table.
 *  - dynamic content tables must filter to `status = 'published'`
 *    (blog, projects, profile_systems, help articles).
 *  - no admin / dashboard / auth route appears in the static page list.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve('supabase/functions/sitemap/index.ts'), 'utf8');

describe('sitemap edge function — public safety (SEO-1)', () => {
  it('businesses query enforces approval_status=published, is_demo=false, is_active=true', () => {
    // The three filters live on the same chained query as the businesses block.
    const block = SRC.split('type === "businesses"')[1] ?? '';
    expect(block).toMatch(/\.eq\(\s*["']is_active["']\s*,\s*true\s*\)/);
    expect(block).toMatch(/\.eq\(\s*["']approval_status["']\s*,\s*["']published["']\s*\)/);
    expect(block).toMatch(/\.eq\(\s*["']is_demo["']\s*,\s*false\s*\)/);
  });

  it('brands sitemap sources from brands_public (approved-only), never brand_catalog', () => {
    const block = SRC.split('type === "brands"')[1] ?? '';
    expect(block).toMatch(/from\(\s*["']brands_public["']\s*\)/);
    expect(block).not.toMatch(/from\(\s*["']brand_catalog["']\s*\)/);
  });

  it('blog / projects / profile_systems / help_articles all filter to status=published', () => {
    for (const slice of ['type === "blog"', 'type === "projects"', 'type === "profiles"', 'type === "help"']) {
      const block = SRC.split(slice)[1]?.split('} else if')[0] ?? '';
      expect(block, `${slice} must filter status=published`).toMatch(
        /\.eq\(\s*["']status["']\s*,\s*["']published["']\s*\)/,
      );
    }
  });

  it('static page list never contains admin / dashboard / auth / onboarding / settings paths', () => {
    const staticBlock = SRC.split('type === "static"')[1]?.split('} else if')[0] ?? '';
    for (const banned of ['/admin', '/dashboard', '/auth', '/onboarding', '/settings', '/forbidden', '/unsubscribe']) {
      expect(staticBlock, `static sitemap must not include ${banned}`).not.toContain(`"${banned}"`);
    }
  });

  it('robots.txt disallows admin/dashboard/auth/onboarding and declares the sitemap', () => {
    const robots = readFileSync(resolve('public/robots.txt'), 'utf8');
    for (const dis of ['/admin/', '/dashboard/', '/auth', '/onboarding']) {
      expect(robots).toContain(`Disallow: ${dis}`);
    }
    expect(robots).toMatch(/Sitemap:\s+https:\/\/qitaat\.com\/sitemap\.xml/);
  });
});