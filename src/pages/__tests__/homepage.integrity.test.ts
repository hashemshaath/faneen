import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('Homepage (/) integrity', () => {
  const app = read('src/App.tsx');
  const index = read('src/pages/Index.tsx');
  const home = read('src/components/home/v2/HomeV2.tsx');

  it('mounts <Index /> at the "/" route', () => {
    expect(app).toMatch(/path="\/"\s+element=\{<Index\s*\/>\}/);
  });

  it('does NOT apply noindex on the homepage', () => {
    expect(index).not.toMatch(/useNoIndex\s*\(/);
    expect(index).not.toMatch(/noindex/i);
  });

  it('renders the eager HeroV2 above the fold (not behind LazyOnView)', () => {
    // Hero must render synchronously so first paint includes the LCP image.
    expect(index).toMatch(/<HeroV2\s*\/>/);
    const heroIdx = index.indexOf('<HeroV2');
    const firstLazyIdx = index.indexOf('<LazyOnView');
    expect(heroIdx).toBeGreaterThan(-1);
    expect(firstLazyIdx).toBeGreaterThan(heroIdx);
  });

  it('homepage SEO ships canonical + JSON-LD via usePageMeta/useMultiJsonLd', () => {
    expect(index).toMatch(/usePageMeta\s*\(/);
    expect(index).toMatch(/useMultiJsonLd\s*\(/);
    expect(index).toMatch(/canonical:\s*['"]https:\/\/qitaat\.com\/?['"]/);
  });

  it('uses real internal routes for hero CTAs (no placeholder hrefs)', () => {
    // Hero CTAs must point at real app routes.
    expect(home).toMatch(/['"]\/search\?intent=quote['"]/);
    expect(home).toMatch(/['"]\/auth\?mode=signup&role=provider['"]/);
    // No placeholder hrefs.
    expect(home).not.toMatch(/href=["']#["']/);
    expect(home).not.toMatch(/to=["']#["']/);
  });

  it('homepage retains language + theme + footer infrastructure', () => {
    expect(index).toMatch(/<Navbar\s*\/>/);
    expect(index).toMatch(/<Footer\s*\/>/);
    // ErrorBoundary wraps the page so a failed section fails soft.
    expect(index).toMatch(/<ErrorBoundary>/);
  });
});