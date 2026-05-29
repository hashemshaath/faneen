import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf-8');

describe('SEO Growth System v1 — baseline guards', () => {
  it('sitemap edge function exposes a help sub-sitemap with categories and articles', () => {
    const src = read('supabase/functions/sitemap/index.ts');
    expect(src).toMatch(/"help"/);
    expect(src).toMatch(/help_categories/);
    expect(src).toMatch(/help_articles/);
    expect(src).toMatch(/\/help\/article\//);
    expect(src).toMatch(/\/help\/category\//);
  });

  it('llms.txt advertises the Help Center to AI crawlers', () => {
    const src = read('public/llms.txt');
    expect(src).toMatch(/https:\/\/qitaat\.com\/help/);
  });

  it('robots.txt keeps private surfaces disallowed and sitemap discoverable', () => {
    const src = read('public/robots.txt');
    expect(src).toMatch(/Disallow:\s*\/admin\//);
    expect(src).toMatch(/Disallow:\s*\/dashboard\//);
    expect(src).toMatch(/Disallow:\s*\/client\/|Disallow:\s*\/q\//);
    expect(src).toMatch(/Sitemap:\s*https:\/\/qitaat\.com\/sitemap\.xml/);
  });

  it('help article page emits Article + BreadcrumbList JSON-LD and a canonical', () => {
    const src = read('src/pages/help/HelpArticlePage.tsx');
    expect(src).toMatch(/useMultiJsonLd/);
    expect(src).toMatch(/'@type': 'Article'/);
    expect(src).toMatch(/'@type': 'BreadcrumbList'/);
    expect(src).toMatch(/canonical:.+\/help\/article\//);
  });

  it('help category page emits BreadcrumbList + ItemList JSON-LD', () => {
    const src = read('src/pages/help/HelpCategoryPage.tsx');
    expect(src).toMatch(/'@type': 'BreadcrumbList'/);
    expect(src).toMatch(/'@type': 'ItemList'/);
  });

  it('help center home emits CollectionPage + BreadcrumbList JSON-LD', () => {
    const src = read('src/pages/help/HelpCenterHome.tsx');
    expect(src).toMatch(/'@type': 'CollectionPage'/);
    expect(src).toMatch(/'@type': 'BreadcrumbList'/);
  });

  it('protected help surfaces stay noindex', () => {
    const issue = read('src/pages/help/ReportIssuePage.tsx');
    const feat = read('src/pages/help/FeatureRequestPage.tsx');
    expect(issue).toMatch(/useNoIndex\(\)/);
    expect(feat).toMatch(/useNoIndex\(\)/);
  });
});