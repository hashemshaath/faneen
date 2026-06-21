/**
 * PUBLIC PAGES CLEANUP — closeout guard.
 *
 * Locks the high-risk public invariants (routes, slugs, SEO files,
 * visibility helpers, type/style hygiene) so future edits cannot
 * silently regress public behaviour.
 *
 * Pure static checks — no DOM mounting, no DB.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const APP = path.resolve(ROOT, 'src/App.tsx');
const ROBOTS = path.resolve(ROOT, 'public/robots.txt');
const SITEMAP = path.resolve(ROOT, 'public/sitemap.xml');

const PUBLIC_PAGES = [
  'src/pages/Index.tsx',
  'src/pages/Search.tsx',
  'src/pages/Categories.tsx',
  'src/pages/QSlugDispatcher.tsx',
  'src/pages/UsernameResolver.tsx',
  'src/pages/RentalsCatalog.tsx',
  'src/pages/RentalItemPublic.tsx',
].map((p) => path.resolve(ROOT, p));

const read = (p: string) => fs.readFileSync(p, 'utf8');

describe('Public pages — cleanup closeout', () => {
  it('critical public routes remain registered', () => {
    const app = read(APP);
    expect(app).toMatch(/path="\/search"/);
    expect(app).toMatch(/path="\/q\/:code"/);
    expect(app).toMatch(/path="\/:username"/);
    expect(app.includes('QSlugDispatcher')).toBe(true);
    expect(app.includes('UsernameResolver')).toBe(true);
  });

  it('public pages exist and are non-empty', () => {
    for (const p of PUBLIC_PAGES) {
      expect(fs.existsSync(p), `missing ${p}`).toBe(true);
      expect(read(p).length).toBeGreaterThan(0);
    }
  });

  it('public pages contain no `any` / suppressions / hex colors', () => {
    for (const p of PUBLIC_PAGES) {
      const src = read(p);
      expect(/\bas\s+any\b/.test(src), `as any in ${p}`).toBe(false);
      expect(/:\s*any\b/.test(src), `: any in ${p}`).toBe(false);
      expect(src.includes('@ts-ignore'), `ts-ignore in ${p}`).toBe(false);
      expect(src.includes('@ts-expect-error'), `ts-expect-error in ${p}`).toBe(false);
      expect(src.includes('eslint-disable'), `eslint-disable in ${p}`).toBe(false);
      // Hardcoded hex literals are banned in public pages — design tokens only.
      expect(/#[0-9a-fA-F]{6}\b/.test(src), `hex in ${p}`).toBe(false);
    }
  });

  it('UsernameResolver remains a resolver (no inline profile rendering)', () => {
    const src = read(path.resolve(ROOT, 'src/pages/UsernameResolver.tsx'));
    expect(src.includes('username')).toBe(true);
    // Must not become an admin/auth gate
    expect(src.includes('service_role')).toBe(false);
  });

  it('QSlugDispatcher remains a dispatcher (no DB writes)', () => {
    const src = read(path.resolve(ROOT, 'src/pages/QSlugDispatcher.tsx'));
    expect(src.includes('service_role')).toBe(false);
    for (const forbidden of ['.insert(', '.update(', '.delete(', '.upsert(']) {
      expect(src.includes(forbidden), `${forbidden} in QSlugDispatcher`).toBe(false);
    }
  });

  it('rentals public pages still gate on published + approved', () => {
    const items = read(path.resolve(ROOT, 'src/modules/rentals/services/items.ts'));
    expect(items).toMatch(/is_published/);
    expect(items).toMatch(/approved/);
  });

  it('SEO/sitemap/robots files remain present', () => {
    expect(fs.existsSync(ROBOTS), 'robots.txt missing').toBe(true);
    expect(fs.existsSync(SITEMAP), 'sitemap.xml missing').toBe(true);
    const robots = read(ROBOTS);
    // Site must not be globally blocked.
    expect(/^User-agent:\s*\*\s*\nDisallow:\s*\/\s*$/m.test(robots)).toBe(false);
  });

  it('public pages do not introduce DB migration / RLS / edge references', () => {
    for (const p of PUBLIC_PAGES) {
      const src = read(p);
      for (const forbidden of [
        'service_role',
        'pg_policies',
        'supabase/migrations',
        'supabase/functions/_shared',
      ]) {
        expect(src.includes(forbidden), `${forbidden} in ${p}`).toBe(false);
      }
    }
  });
});