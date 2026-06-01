import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * SEO-8 — public-safe slug exposure for ProjectDetail + Showcase/Projects
 * hub outbound linking. Verifies:
 *  - ProjectDetail derives sector/city slugs from curated public sources
 *    (CATEGORY_SLUG_TO_SECTOR + SA_CITIES) and only renders deep sector
 *    links when those slugs exist.
 *  - Projects and Showcase add small cross-hub navs to public hubs.
 *  - No private/session/search routes are linked from the new SEO-8 blocks.
 */

const read = (p: string) => readFileSync(resolve(p), 'utf8');
const PRIVATE_PREFIXES = ['/admin', '/onboarding', '/settings', '/notifications'];

function extractLinkTargets(src: string): string[] {
  const out: string[] = [];
  const reStr = /to="([^"]+)"/g;
  const reTpl = /to=\{`([^`]+)`\}/g;
  let m: RegExpExecArray | null;
  while ((m = reStr.exec(src))) out.push(m[1]);
  while ((m = reTpl.exec(src))) {
    out.push(m[1].replace(/\$\{[^}]+\}/g, ':slug'));
  }
  return out;
}

describe('SEO-8 ProjectDetail slug-guarded sector deep links', () => {
  const src = read('src/pages/ProjectDetail.tsx');

  it('imports the curated sector/city slug sources', () => {
    expect(src).toContain("from '@/lib/sector-keywords'");
    expect(src).toContain('detectSectorFromCategorySlug');
    expect(src).toContain("from '@/lib/sa-cities'");
    expect(src).toContain('SA_CITIES');
  });

  it('fetches the category slug (not just names) via getCategoryById', () => {
    expect(src).toMatch(/getCategoryById<[^>]*slug[^>]*>/);
    expect(src).toMatch(/select:\s*'slug,\s*name_ar,\s*name_en'/);
  });

  it('derives sectorSlug from category.slug and citySlug from SA_CITIES', () => {
    expect(src).toMatch(/sectorSlug\s*=\s*detectSectorFromCategorySlug\(category\?\.slug/);
    expect(src).toMatch(/citySlug[\s\S]{0,200}SA_CITIES\.find/);
  });

  it('renders /sectors/:slug and /sectors/:slug/:city only when slugs exist', () => {
    // Both links are wrapped in `{sectorSlug && ...}` / `{sectorSlug && citySlug && ...}`
    expect(src).toMatch(/\{sectorSlug\s*&&[\s\S]{0,300}to=\{`\/sectors\/\$\{sectorSlug\}`\}/);
    expect(src).toMatch(/\{sectorSlug\s*&&\s*citySlug\s*&&[\s\S]{0,400}to=\{`\/sectors\/\$\{sectorSlug\}\/\$\{citySlug\}`\}/);
  });

  it('does not invent slugs from names', () => {
    // Guard against the obvious mistakes — never use raw names to build URLs.
    expect(src).not.toMatch(/sectors\/\$\{[^}]*name_ar[^}]*\}/);
    expect(src).not.toMatch(/sectors\/\$\{[^}]*name_en[^}]*\}/);
  });

  it('does not link to private/session routes', () => {
    const targets = extractLinkTargets(src);
    for (const t of targets) {
      for (const p of PRIVATE_PREFIXES) {
        expect(t.startsWith(p), `ProjectDetail links to private ${t}`).toBe(false);
      }
      expect(t.startsWith('/dashboard')).toBe(false);
      expect(t.startsWith('/search?q=')).toBe(false);
      expect(t.startsWith('/compare?ids=')).toBe(false);
    }
  });
});

describe('SEO-8 Projects hub cross-links', () => {
  const src = read('src/pages/Projects.tsx');
  const targets = extractLinkTargets(src);

  it('links to all required public hubs', () => {
    for (const hub of ['/showcase', '/sectors', '/services', '/brands']) {
      expect(targets).toContain(hub);
    }
  });

  it('does not link to private/session routes', () => {
    for (const t of targets) {
      for (const p of PRIVATE_PREFIXES) {
        expect(t.startsWith(p), `Projects links to private ${t}`).toBe(false);
      }
      expect(t.startsWith('/dashboard')).toBe(false);
    }
  });
});

describe('SEO-8 Showcase hub cross-links', () => {
  const src = read('src/pages/Showcase.tsx');

  it('adds a cross-hub nav linking to public hubs only', () => {
    // Scope the assertion to the SEO-8 nav block to avoid colliding with the
    // provider CTA (`/dashboard/showcase`) which predates this phase.
    const m = src.match(/SEO-8[\s\S]+?<\/nav>/);
    expect(m, 'SEO-8 nav block present').toBeTruthy();
    const block = m![0];
    for (const hub of ['/projects', '/sectors', '/services', '/brands']) {
      expect(block).toContain(`to="${hub}"`);
    }
    // The cross-hub nav itself must not contain any private links.
    for (const p of PRIVATE_PREFIXES) {
      expect(block.includes(`to="${p}`), `Showcase SEO-8 nav links to ${p}`).toBe(false);
    }
    expect(block.includes('to="/dashboard')).toBe(false);
  });

  it('preserves approved-only source filter on showcase submissions', () => {
    // SEO-8 deferred ItemList; SEO-10A enabled it after enforcing verified
    // businesses on the join. The approved-only filter must remain in place.
    expect(src).toMatch(/\.eq\(["']status["'],\s*["']approved["']\)/);
  });
});