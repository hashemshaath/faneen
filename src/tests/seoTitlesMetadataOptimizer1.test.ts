/**
 * SEO-TITLES-METADATA-OPTIMIZER-1 — Stage 4 acceptance tests.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildSeo,
  buildSeoTitle,
  buildSeoDescription,
  buildSeoKeywords,
  containsRawId,
  TITLE_MAX,
  DESCRIPTION_MAX,
  SITE_NAME_AR,
  SITE_NAME_EN,
} from '@/modules/seo/seoTitleBuilder';

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const REF = 'USR-1000017';

describe('seoTitleBuilder — language rules', () => {
  it('builds Arabic company title with activity + city', () => {
    const t = buildSeoTitle({
      kind: 'company',
      lang: 'ar',
      name: 'مصنع الرياض',
      activity: 'ألمنيوم',
      city: 'الرياض',
    });
    expect(t).toContain('مصنع الرياض');
    expect(t).toContain('ألمنيوم');
    expect(t).toContain('الرياض');
    expect(t.endsWith(SITE_NAME_AR)).toBe(true);
  });

  it('builds English category title with country suffix', () => {
    const t = buildSeoTitle({ kind: 'category', lang: 'en', name: 'Aluminum' });
    expect(t).toContain('Aluminum');
    expect(t).toContain('Saudi Arabia');
    expect(t.endsWith(SITE_NAME_EN)).toBe(true);
  });

  it('blog suffix does not double the site name', () => {
    const t = buildSeoTitle({ kind: 'blog', lang: 'en', name: 'How aluminum facades age' });
    expect(t).toContain('Qitaat Blog');
    expect(t.match(/Qitaat/g)?.length).toBe(1);
  });
});

describe('seoTitleBuilder — length safety', () => {
  it('clamps very long custom titles to TITLE_MAX', () => {
    const long = 'ا'.repeat(200);
    const t = buildSeoTitle({ kind: 'company', lang: 'ar', customTitle: long });
    expect(t.length).toBeLessThanOrEqual(TITLE_MAX);
  });

  it('clamps long descriptions to DESCRIPTION_MAX', () => {
    const long = 'word '.repeat(200);
    const d = buildSeoDescription({ kind: 'company', lang: 'en', rawDescription: long });
    expect(d.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it('keeps generic kind templates within max length', () => {
    const kinds = ['home', 'company', 'category', 'brand', 'service', 'project', 'blog', 'search', 'offer', 'help'] as const;
    for (const kind of kinds) {
      for (const lang of ['ar', 'en'] as const) {
        const t = buildSeoTitle({ kind, lang, name: 'Example' });
        const d = buildSeoDescription({ kind, lang, name: 'Example' });
        expect(t.length, `title ${kind}/${lang}`).toBeLessThanOrEqual(TITLE_MAX);
        expect(d.length, `desc ${kind}/${lang}`).toBeLessThanOrEqual(DESCRIPTION_MAX);
      }
    }
  });
});

describe('seoTitleBuilder — ID hygiene', () => {
  it('strips UUIDs from editor-supplied titles', () => {
    const t = buildSeoTitle({ kind: 'company', lang: 'en', customTitle: `Acme ${UUID}` });
    expect(containsRawId(t)).toBe(false);
  });

  it('strips internal Ref IDs from editor-supplied titles', () => {
    const t = buildSeoTitle({ kind: 'company', lang: 'en', customTitle: `Acme ${REF}` });
    expect(containsRawId(t)).toBe(false);
  });

  it('does not leak UUIDs into auto-built titles', () => {
    const t = buildSeoTitle({ kind: 'project', lang: 'en', name: 'Riyadh Tower' });
    expect(containsRawId(t)).toBe(false);
  });
});

describe('seoTitleBuilder — fallbacks', () => {
  it('falls back to generic name when entity name is missing', () => {
    const t = buildSeoTitle({ kind: 'company', lang: 'ar' });
    expect(t.length).toBeGreaterThan(0);
    expect(t).toContain(SITE_NAME_AR);
  });

  it('prefers raw description when long enough', () => {
    const fromRaw = buildSeoDescription({
      kind: 'company',
      lang: 'en',
      rawDescription: 'Family-run aluminum workshop serving Riyadh since 1998, specializing in facades.',
    });
    expect(fromRaw).toMatch(/Family-run/);
    const fromTemplate = buildSeoDescription({ kind: 'company', lang: 'en', name: 'Acme' });
    expect(fromTemplate).toMatch(/Acme/);
  });
});

describe('seoTitleBuilder — convenience + keywords', () => {
  it('buildSeo returns title + description + keywords together', () => {
    const out = buildSeo({
      kind: 'category',
      lang: 'en',
      name: 'Glass',
      city: 'Jeddah',
      keywords: ['shopfronts', 'shower cabins'],
    });
    expect(out.title.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(out.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(out.keywords).toMatch(/Glass/);
  });

  it('keyword joiner dedupes and clamps to 12 items', () => {
    const k = buildSeoKeywords({
      kind: 'category',
      lang: 'en',
      name: 'Glass',
      keywords: Array.from({ length: 20 }, (_, i) => `kw-${i}`),
    });
    const items = (k ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    expect(items.length).toBeLessThanOrEqual(12);
    expect(new Set(items).size).toBe(items.length);
  });
});

describe('sitemap edge function — public-only surface', () => {
  const source = readFileSync(
    resolve(__dirname, '../../supabase/functions/sitemap/index.ts'),
    'utf8',
  );

  it('only enumerates public route types', () => {
    expect(source).toMatch(/TYPES = \[[^\]]+\]/);
    expect(source).not.toMatch(/"admin"|"dashboard"|"auth"/);
  });

  it('filters businesses to published, active, non-demo rows', () => {
    expect(source).toMatch(/\.eq\("is_active", true\)/);
    expect(source).toMatch(/\.eq\("approval_status", "published"\)/);
    expect(source).toMatch(/\.eq\("is_demo", false\)/);
  });

  it('publishes blog posts only when status = published', () => {
    expect(source).toMatch(/from\("blog_posts"\)[\s\S]*?\.eq\("status", "published"\)/);
  });

  it('serves XML with a long-lived public cache header', () => {
    expect(source).toMatch(/Content-Type":\s*"application\/xml/);
    expect(source).toMatch(/Cache-Control":\s*"public, max-age=\d+/);
  });
});

describe('useNoIndex hook — importable', () => {
  it('exports a noindex hook', async () => {
    const mod = await import('@/hooks/useNoIndex');
    expect(typeof mod.useNoIndex).toBe('function');
  });
});