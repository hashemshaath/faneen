/**
 * CONTRACT TEMPLATE SEO PHASE 1
 *
 * Safe SEO for general contract templates only. No real contract data is
 * indexed, exposed, or referenced from any public surface.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf8');

describe('Contract Template SEO Phase 1', () => {
  const page = read('src/pages/ContractTemplates.tsx');
  const app = read('src/App.tsx');
  const sitemap = read('public/sitemap.xml');
  const ctSitemap = read('public/sitemap-contract-templates.xml');
  const robots = read('public/robots.txt');
  const llms = read('public/llms.txt');
  const pdf = read('src/lib/contract-pdf-export.ts');

  it('mounts /contract-templates and /contract-templates/:slug routes', () => {
    expect(app).toMatch(/path="\/contract-templates"/);
    expect(app).toMatch(/path="\/contract-templates\/:slug"/);
  });

  it('public template page does not leak real party/price/site/BOQ/WO data', () => {
    expect(page).not.toMatch(/client_name|clientName|provider_name|providerName/);
    expect(page).not.toMatch(/total_amount|grand_total|unit_price/);
    expect(page).not.toMatch(/site_address|execution_site|site_id/);
    expect(page).not.toMatch(/boq_items|measurement_sheet/i);
    expect(page).not.toMatch(/work_orders?/i);
    expect(page).not.toMatch(/pdf_url|signed_url/i);
  });

  it('uses only safe JSON-LD types (Article/Service/CollectionPage/BreadcrumbList)', () => {
    expect(page).toMatch(/'@type': 'CollectionPage'/);
    expect(page).toMatch(/'@type': 'Article'/);
    expect(page).toMatch(/'@type': 'Service'/);
    expect(page).toMatch(/'@type': 'BreadcrumbList'/);
    expect(page).not.toMatch(/'@type':\s*'Contract'/);
    expect(page).not.toMatch(/'@type':\s*'Invoice'/);
    expect(page).not.toMatch(/'@type':\s*'Order'/);
  });

  it('contract-templates sitemap contains only public template URLs', () => {
    expect(ctSitemap).toMatch(/\/contract-templates(<|\/)/);
    expect(ctSitemap).toMatch(/\/contract-templates\/aluminum-glass/);
    expect(ctSitemap).toMatch(/\/contract-templates\/steel-metal/);
    expect(ctSitemap).toMatch(/\/contract-templates\/wood-works/);
    expect(ctSitemap).toMatch(/\/contract-templates\/kitchens/);
    expect(ctSitemap).toMatch(/\/contract-templates\/facades/);
    expect(ctSitemap).toMatch(/\/contract-templates\/stainless-railings/);
    // No real contracts, no verify URLs
    expect(ctSitemap).not.toMatch(/\/contracts\//);
    expect(ctSitemap).not.toMatch(/\/v\/c\//);
  });

  it('root sitemap index references the templates sitemap and stays free of real contracts', () => {
    expect(sitemap).toMatch(/sitemap-contract-templates\.xml/);
    expect(sitemap).not.toMatch(/\/contracts\//);
    expect(sitemap).not.toMatch(/\/v\/c\//);
    expect(sitemap).not.toMatch(/type=contracts?/i);
  });

  it('robots.txt still disallows /contracts and /v/c/', () => {
    expect(robots).toMatch(/Disallow:\s*\/contracts(\s|$)/m);
    expect(robots).toMatch(/Disallow:\s*\/contracts\//);
    expect(robots).toMatch(/Disallow:\s*\/v\/c\//);
    expect(robots).toMatch(/Disallow:\s*\/dashboard\//);
    expect(robots).toMatch(/Disallow:\s*\/admin\//);
  });

  it('llms.txt does not enumerate real contracts or verify URLs', () => {
    expect(llms).not.toMatch(/\/contracts\/[a-f0-9-]{8,}/i);
    expect(llms).not.toMatch(/\/v\/c\//);
  });

  it('contract PDF export stays a client blob (no public bucket / public URL)', () => {
    expect(pdf).not.toMatch(/storage\.from\(\s*["']contracts?["']\s*\)/);
    expect(pdf).not.toMatch(/createPublicUrl|getPublicUrl/);
  });

  it('meta title/description use only generic copy (no IDs, no party names, no prices)', () => {
    expect(page).toMatch(/قوالب عقود تنفيذ الأعمال/);
    expect(page).not.toMatch(/CON-\d+|WO-\d+/);
    expect(page).not.toMatch(/SAR\s*\d|﷼\s*\d/);
  });
});