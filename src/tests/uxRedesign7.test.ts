import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  contextualHelpRegistry,
  getContextualArticles,
} from '@/modules/helpCenter';
import {
  nextBestActionRegistry,
  getNextBestAction,
} from '@/modules/helpCenter/nextBestAction';

const read = (p: string) => fs.readFileSync(path.resolve(p), 'utf8');

describe('UX-REDESIGN-7 — Help / Blog / Content Contextual Mapping', () => {
  // ── Part C — contextual mappings exist ─────────────────────────────
  it('public surfaces are mapped in contextualHelpRegistry', () => {
    for (const key of [
      'public.home',
      'public.search',
      'public.sector-detail',
      'public.provider-detail',
      'public.quote',
      'public.blog',
      'public.blog-post',
      'public.brands',
      'public.brand-detail',
    ]) {
      expect(getContextualArticles(key).length).toBeGreaterThan(0);
    }
  });

  // ── Part E — every NBA target is a real, safe route ────────────────
  it('every NBA target is an app-relative, safe route', () => {
    for (const [slug, nba] of Object.entries(nextBestActionRegistry)) {
      expect(nba.to.startsWith('/')).toBe(true);
      expect(nba.label_ar.length).toBeGreaterThan(0);
      expect(nba.label_en.length).toBeGreaterThan(0);
      // admin targets must only be paired with admin audience entries
      if (nba.to.startsWith('/admin/')) {
        expect(nba.audience).toBe('admin');
      }
      // never link to placeholder routes
      expect(nba.to).not.toMatch(/(undefined|null|TODO)/);
      expect(slug.length).toBeGreaterThan(0);
    }
  });

  it('default fallback NBA is /sectors (public-safe)', () => {
    const fallback = getNextBestAction('definitely-not-a-real-slug');
    expect(fallback.to).toBe('/sectors');
  });

  it('customer audience never receives an admin NBA', () => {
    const got = getNextBestAction('identity-overview', 'customer');
    expect(got.to.startsWith('/admin/')).toBe(false);
  });

  // ── Part D — Blog conversion coverage ──────────────────────────────
  it('Blog hero exposes /quote and /sectors CTAs', () => {
    const src = read('src/pages/Blog.tsx');
    expect(src).toMatch(/\/quote/);
    expect(src).toMatch(/\/sectors/);
  });

  it('BlogPost ships a related-help block and a quote CTA', () => {
    const src = read('src/pages/BlogPost.tsx');
    expect(src).toMatch(/data-testid="blog-related-help"/);
    expect(src).toMatch(/getContextualArticles\(['"]public\.blog-post['"]\)/);
    expect(src).toMatch(/to="\/quote"/);
    expect(src).toMatch(/to="\/sectors"/);
  });

  // ── Part E — Help → product NBA card present ───────────────────────
  it('HelpArticlePage renders the Next Best Action card', () => {
    const src = read('src/pages/help/HelpArticlePage.tsx');
    expect(src).toMatch(/data-testid="help-next-best-action"/);
    expect(src).toMatch(/getNextBestAction\(/);
  });

  // ── Part F — internal linking sanity ───────────────────────────────
  it('contextualHelpRegistry references no /admin or /dashboard URLs (slug-only)', () => {
    for (const slugs of Object.values(contextualHelpRegistry)) {
      for (const s of slugs) {
        expect(s).not.toMatch(/^\//);
      }
    }
  });

  // ── Part J — no orphan help slugs ──────────────────────────────────
  it('every NBA registry slug is referenced from at least one pageKey OR is a public discovery slug', () => {
    const allMappedSlugs = new Set<string>();
    for (const slugs of Object.values(contextualHelpRegistry)) {
      slugs.forEach((s) => allMappedSlugs.add(s));
    }
    const orphans = Object.keys(nextBestActionRegistry).filter(
      (slug) => !allMappedSlugs.has(slug),
    );
    // Allow a small whitelist of discovery-only slugs that don't need a pageKey
    const allowed = new Set<string>([]);
    const real = orphans.filter((s) => !allowed.has(s));
    expect(real).toEqual([]);
  });

  // ── Part K — no scope creep (no banned topics) ─────────────────────
  it('no inventory / accounting / supplier-portal scope creep in registries', () => {
    const blob = JSON.stringify({ contextualHelpRegistry, nextBestActionRegistry }).toLowerCase();
    for (const bad of ['inventory', 'accounting', 'supplier-portal', 'whatsapp-bot', 'sms-gateway']) {
      expect(blob).not.toContain(bad);
    }
  });

  // ── Part H — SEO docs exist (alignment artefacts) ──────────────────
  it('audit docs are produced', () => {
    for (const f of [
      'docs/content-architecture-audit.md',
      'docs/content-journey-map.md',
      'docs/contextual-content-matrix.md',
      'docs/blog-conversion-audit.md',
      'docs/help-conversion-audit.md',
      'docs/internal-linking-audit.md',
      'docs/content-seo-alignment.md',
    ]) {
      expect(fs.existsSync(path.resolve(f))).toBe(true);
    }
  });
});