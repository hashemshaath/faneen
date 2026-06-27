/**
 * CONTRACT TEMPLATE SEO CONTENT + INTERNAL LINKING PHASE 2
 *
 * Asserts every public template carries safe educational content,
 * internal links to the sector / quote / providers / register-entity,
 * a breadcrumb, and a safe FAQPage JSON-LD. No real contract data,
 * no party names, no prices, no execution sites.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CONTRACT_TEMPLATES } from '@/pages/ContractTemplates';

const read = (p: string) => readFileSync(resolve(p), 'utf8');

describe('Contract Template SEO Phase 2 — content', () => {
  it.each(CONTRACT_TEMPLATES.map((t) => [t.slug, t]))(
    'template %s carries clauses, attention points, scope, use cases, FAQ',
    (_slug, t) => {
      expect(t.clauses_ar.length).toBeGreaterThanOrEqual(3);
      expect(t.clauses_en.length).toBeGreaterThanOrEqual(3);
      expect(t.attention_ar.length).toBeGreaterThanOrEqual(3);
      expect(t.attention_en.length).toBeGreaterThanOrEqual(3);
      expect(t.use_cases_ar.length).toBeGreaterThanOrEqual(3);
      expect(t.scope_ar.length).toBeGreaterThanOrEqual(3);
      expect(t.faq.length).toBeGreaterThanOrEqual(3);
      expect(t.sector_route.startsWith('/sectors/')).toBe(true);
    },
  );

  it('no template content leaks party names, prices, sites, or BOQ/WO terms', () => {
    const forbidden = /(client_name|provider_name|SAR\s*\d|﷼\s*\d|site_address|execution_site|boq|work[_ ]?order|CON-\d+|WO-\d+)/i;
    for (const t of CONTRACT_TEMPLATES) {
      const blob = JSON.stringify(t);
      expect(forbidden.test(blob), `${t.slug} leaks forbidden token`).toBe(false);
    }
  });
});

describe('Contract Template SEO Phase 2 — page wiring', () => {
  const src = read('src/pages/ContractTemplates.tsx');

  it('detail page renders clauses, attention points and FAQ sections', () => {
    expect(src).toMatch(/أهم البنود العامة|Key general clauses/);
    expect(src).toMatch(/نقاط يجب الانتباه لها|Points to watch/);
    expect(src).toMatch(/الأسئلة الشائعة|Frequently asked questions/);
  });

  it('detail page links internally to sector, quote, providers and register-entity', () => {
    expect(src).toMatch(/to=\{template\.sector_route\}/);
    expect(src).toMatch(/\/quote\?sector=/);
    expect(src).toMatch(/\/search\?sector=/);
    expect(src).toMatch(/to="\/register-entity"/);
  });

  it('detail page links to related templates', () => {
    expect(src).toMatch(/to=\{`\/contract-templates\/\$\{r\.slug\}`\}/);
  });

  it('detail page renders a breadcrumb (الرئيسية → قوالب العقود → …)', () => {
    expect(src).toMatch(/الرئيسية|Home/);
    expect(src).toMatch(/قوالب العقود|Contract Templates/);
    expect(src).toMatch(/'@type': 'BreadcrumbList'/);
  });

  it('detail page emits a FAQPage JSON-LD and only safe schema types', () => {
    expect(src).toMatch(/'@type': 'FAQPage'/);
    expect(src).toMatch(/'@type': 'Question'/);
    expect(src).toMatch(/'@type': 'Answer'/);
    expect(src).not.toMatch(/'@type':\s*'Contract'/);
    expect(src).not.toMatch(/'@type':\s*'Invoice'/);
    expect(src).not.toMatch(/'@type':\s*'Order'/);
  });

  it('no real contract data, public PDF or public bucket referenced', () => {
    expect(src).not.toMatch(/\/contracts\/[a-f0-9-]{8,}/i);
    expect(src).not.toMatch(/\/v\/c\//);
    expect(src).not.toMatch(/storage\.from\(\s*["']contracts?["']\s*\)/);
    expect(src).not.toMatch(/getPublicUrl|createPublicUrl/);
    expect(src).not.toMatch(/service_role/i);
  });
});

describe('Contract Template SEO Phase 2 — SEO guards still hold', () => {
  const sitemap = read('public/sitemap.xml');
  const ctSitemap = read('public/sitemap-contract-templates.xml');
  const robots = read('public/robots.txt');

  it('sitemaps remain free of real contracts and verify URLs', () => {
    for (const xml of [sitemap, ctSitemap]) {
      expect(xml).not.toMatch(/\/contracts\/[a-f0-9-]{8,}/i);
      expect(xml).not.toMatch(/\/v\/c\//);
    }
  });

  it('robots still disallows /contracts and /v/c/', () => {
    expect(robots).toMatch(/Disallow:\s*\/contracts(\s|$)/m);
    expect(robots).toMatch(/Disallow:\s*\/v\/c\//);
  });
});