import { describe, it, expect } from 'vitest';
import {
  buildSeoTitle,
  buildSeoDescription,
  buildSeoKeywords,
  buildSeo,
  cleanText,
  truncate,
  containsRawId,
  TITLE_MAX,
  DESCRIPTION_MAX,
} from '@/modules/seo/seoTitleBuilder';

describe('seoTitleBuilder — utilities', () => {
  it('cleanText strips HTML, markdown emphasis, and collapses whitespace', () => {
    expect(cleanText('  <b>Hello</b>  **world**\n line ')).toBe('Hello world line');
    expect(cleanText(null)).toBe('');
    expect(cleanText(undefined)).toBe('');
  });

  it('truncate respects the max length and breaks on word boundary', () => {
    const text = 'one two three four five six seven eight nine ten eleven twelve';
    const out = truncate(text, 25);
    expect(out.length).toBeLessThanOrEqual(25);
    expect(out.endsWith('…')).toBe(true);
  });

  it('containsRawId detects UUIDs and internal Ref IDs', () => {
    expect(containsRawId('USR-1000001')).toBe(true);
    expect(containsRawId('11111111-2222-3333-4444-555555555555')).toBe(true);
    expect(containsRawId('Acme Aluminum')).toBe(false);
    expect(containsRawId(null)).toBe(false);
  });
});

describe('buildSeoTitle — Arabic templates', () => {
  it('company → name | activity في city | قطاعات', () => {
    const t = buildSeoTitle({ kind: 'company', lang: 'ar', name: 'مصنع النور', activity: 'ألمنيوم', city: 'الرياض' });
    expect(t).toContain('مصنع النور');
    expect(t).toContain('ألمنيوم');
    expect(t).toContain('في الرياض');
    expect(t).toContain('قطاعات');
  });

  it('category → uses Saudi Arabia phrasing', () => {
    const t = buildSeoTitle({ kind: 'category', lang: 'ar', name: 'الزجاج' });
    expect(t).toContain('الزجاج في السعودية');
    expect(t).toContain('قطاعات');
  });

  it('brand template includes verified providers phrasing', () => {
    const t = buildSeoTitle({ kind: 'brand', lang: 'ar', name: 'سايدر' });
    expect(t).toContain('سايدر');
    expect(t).toContain('مزودون معتمدون');
  });

  it('service template includes quotes phrasing', () => {
    const t = buildSeoTitle({ kind: 'service', lang: 'ar', name: 'تركيب واجهات زجاجية' });
    expect(t).toContain('عروض ومزودون موثوقون');
  });

  it('blog template uses blog suffix only (no double site)', () => {
    const t = buildSeoTitle({ kind: 'blog', lang: 'ar', name: 'دليل الألمنيوم' });
    expect(t).toBe('دليل الألمنيوم | مدونة قطاعات');
  });

  it('search default phrasing', () => {
    const t = buildSeoTitle({ kind: 'search', lang: 'ar' });
    expect(t).toContain('ابحث عن مزودي خدمات التصنيع');
    expect(t).toContain('قطاعات');
  });
});

describe('buildSeoTitle — English templates', () => {
  it('company in English', () => {
    const t = buildSeoTitle({ kind: 'company', lang: 'en', name: 'Acme Aluminum', activity: 'Aluminum Fabrication', city: 'Riyadh' });
    expect(t).toContain('Acme Aluminum');
    expect(t).toContain('Aluminum Fabrication in Riyadh');
    expect(t).toContain('Qitaat');
  });

  it('category English mentions Saudi Arabia and Qitaat', () => {
    const t = buildSeoTitle({ kind: 'category', lang: 'en', name: 'Glass' });
    expect(t).toContain('Glass in Saudi Arabia');
    expect(t).toContain('Qitaat');
  });

  it('blog English uses Qitaat Blog suffix', () => {
    const t = buildSeoTitle({ kind: 'blog', lang: 'en', name: 'Aluminum Guide' });
    expect(t).toBe('Aluminum Guide | Qitaat Blog');
  });
});

describe('buildSeoTitle — fallbacks and safety', () => {
  it('falls back to a generic name when name is missing', () => {
    const t = buildSeoTitle({ kind: 'company', lang: 'ar' });
    expect(t).toContain('شركة');
    expect(t).toContain('قطاعات');
  });

  it('never exceeds TITLE_MAX', () => {
    const longName = 'مصنع الألمنيوم والزجاج المتقدم للأعمال الصناعية الكبيرة جداً جداً جداً جداً';
    const t = buildSeoTitle({ kind: 'company', lang: 'ar', name: longName, activity: 'ألمنيوم', city: 'الرياض' });
    expect(t.length).toBeLessThanOrEqual(TITLE_MAX);
  });

  it('strips raw UUIDs and Ref IDs from editor-supplied custom titles', () => {
    const t = buildSeoTitle({
      kind: 'company',
      lang: 'ar',
      name: 'Acme',
      customTitle: 'شركة USR-1000001 الرائدة 11111111-2222-3333-4444-555555555555',
    });
    expect(t).not.toMatch(/USR-\d/);
    expect(t).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/);
  });

  it('customTitle override is honored and gets site suffix', () => {
    const t = buildSeoTitle({ kind: 'company', lang: 'en', name: 'Acme', customTitle: 'Custom Heading' });
    expect(t.startsWith('Custom Heading')).toBe(true);
    expect(t).toContain('Qitaat');
  });
});

describe('buildSeoDescription', () => {
  it('never exceeds DESCRIPTION_MAX', () => {
    const long = 'أ'.repeat(400);
    const d = buildSeoDescription({ kind: 'company', lang: 'ar', rawDescription: long });
    expect(d.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it('prefers editor customDescription', () => {
    const d = buildSeoDescription({ kind: 'company', lang: 'en', customDescription: 'A short editor sentence.' });
    expect(d).toBe('A short editor sentence.');
  });

  it('falls back to a generic, language-correct sentence when no data', () => {
    const ar = buildSeoDescription({ kind: 'search', lang: 'ar' });
    const en = buildSeoDescription({ kind: 'search', lang: 'en' });
    expect(ar).toMatch(/ابحث/);
    expect(en).toMatch(/Find/);
  });
});

describe('buildSeoKeywords', () => {
  it('returns undefined for empty inputs', () => {
    expect(buildSeoKeywords({ kind: 'home', lang: 'ar' })).toContain('قطاعات');
    expect(buildSeoKeywords({ kind: 'home', lang: 'en' })).toContain('Qitaat');
  });

  it('dedupes and trims keyword list', () => {
    const k = buildSeoKeywords({
      kind: 'company',
      lang: 'ar',
      name: 'Acme',
      activity: 'Acme',
      keywords: ['Acme', 'ألمنيوم', 'ألمنيوم'],
    });
    expect(k).toBeDefined();
    const parts = (k as string).split(', ');
    expect(new Set(parts).size).toBe(parts.length);
  });
});

describe('buildSeo (composite)', () => {
  it('returns title, description, and keywords together with no UUIDs', () => {
    const out = buildSeo({ kind: 'company', lang: 'ar', name: 'مصنع النور', activity: 'ألمنيوم', city: 'الرياض' });
    expect(out.title.length).toBeGreaterThan(0);
    expect(out.description.length).toBeGreaterThan(0);
    expect(containsRawId(out.title)).toBe(false);
    expect(containsRawId(out.description)).toBe(false);
  });
});