import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * SEO-7 — leaf-node hub/spoke depth.
 * Verifies BusinessProfile and ProjectDetail contain safe outbound links
 * back to public hubs without leaking private/session routes.
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

describe('SEO-7 BusinessProfile leaf links', () => {
  const src = read('src/pages/BusinessProfile.tsx');
  const targets = extractLinkTargets(src);

  it('links to all required public hubs', () => {
    for (const hub of ['/sectors', '/services', '/brands', '/showcase']) {
      expect(targets).toContain(hub);
    }
  });

  it('emits sector + sector-city links from public slug data only', () => {
    expect(src).toMatch(/to=\{`\/sectors\/\$\{[^`]+\}`\}/);
    expect(src).toMatch(/to=\{`\/sectors\/\$\{[^`]+\}\/\$\{[^`]+\}`\}/);
    // The sector hub-link section is conditionally rendered on the public
    // category slug (no slug → no leaf link).
    expect(src).toMatch(/business\.categories[\s\S]{0,200}\.slug[\s\S]{0,400}sectors\//);
  });

  it('does not link to private/session/search/compare routes', () => {
    for (const t of targets) {
      for (const p of PRIVATE_PREFIXES) {
        expect(t.startsWith(p), `BusinessProfile links to private ${t}`).toBe(false);
      }
      expect(t.startsWith('/dashboard')).toBe(false);
      expect(t.startsWith('/search?q=')).toBe(false);
      expect(t.startsWith('/compare?ids=')).toBe(false);
    }
  });
});

describe('SEO-7 ProjectDetail leaf links', () => {
  const src = read('src/pages/ProjectDetail.tsx');
  const targets = extractLinkTargets(src);

  it('keeps provider profile and projects-hub links', () => {
    expect(targets).toContain('/projects');
    // provider profile link is `/${project.businesses.username}` → normalised to /:slug
    expect(targets.some((t) => t === '/:slug')).toBe(true);
  });

  it('adds hub cross-links to sectors/services/brands/showcase', () => {
    for (const hub of ['/sectors', '/services', '/brands', '/showcase']) {
      expect(targets).toContain(hub);
    }
  });

  it('does not link to private/session/search/compare routes', () => {
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
