import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const files = [
  'src/components/business-profile/BusinessProfileHeader.tsx',
  'src/components/business-profile/OverviewTab.tsx',
  'src/components/business-profile/BusinessProfileTabs.tsx',
  'src/components/business-profile/RfqTab.tsx',
];

const read = (p: string) => readFileSync(path.resolve(p), 'utf8');

describe('Business profile RTL/LTR direction hygiene', () => {
  it('uses no native <input> / <textarea> (must go through shared primitives)', () => {
    for (const f of files) {
      const src = read(f);
      expect(src, `${f} should not use native <input>`).not.toMatch(/<input\b/);
      expect(src, `${f} should not use native <textarea>`).not.toMatch(/<textarea\b/);
    }
  });

  it('does not use raw toLocaleString() for numeric prices', () => {
    for (const f of files) {
      const src = read(f);
      expect(src, `${f} should use fmtNum instead of toLocaleString()`).not.toMatch(/\.toLocaleString\(\)/);
    }
  });

  it('header h1 (business name) declares dir="auto"', () => {
    const src = read('src/components/business-profile/BusinessProfileHeader.tsx');
    expect(src).toMatch(/<h1\s+dir="auto"/);
  });

  it('OverviewTab description paragraph declares dir="auto"', () => {
    const src = read('src/components/business-profile/OverviewTab.tsx');
    expect(src).toMatch(/<p dir="auto"[^>]*>\{desc\}/);
  });

  it('Contact tab phone/email/website rows fall back to dir="auto" (no undefined leak)', () => {
    const src = read('src/components/business-profile/BusinessProfileTabs.tsx');
    expect(src).not.toMatch(/dir=\{item\.dir \|\| undefined\}/);
    expect(src).toMatch(/dir=\{item\.dir \|\| "auto"\}/);
  });

  it('RFQ mixed timeline values are rendered as isolated LTR technical text', () => {
    const src = read('src/components/business-profile/RfqTab.tsx');
    expect(src).toMatch(/import \{ TechnicalText \} from "@\/components\/ui\/technical-text"/);
    expect(src).toMatch(/MIXED_TIMELINE_VALUES/);
    expect(src).toMatch(/timelineLabel\(form\.timeline\)/);
    expect(src).toMatch(/<TechnicalText mono=\{false\}>\{bi\("1–3 أشهر", "1–3 months"\)\}<\/TechnicalText>/);
    expect(src).toMatch(/<TechnicalText mono=\{false\}>\{bi\("3–6 أشهر", "3–6 months"\)\}<\/TechnicalText>/);
  });

  it('RFQ phone/email/budget inputs stay technical LTR and avoid Arabic-Indic literals', () => {
    const src = read('src/components/business-profile/RfqTab.tsx');
    expect(src).toMatch(/type="tel"[^>]*dir="ltr"[^>]*tech-content/s);
    expect(src).toMatch(/type="email"[^>]*dir="ltr"[^>]*tech-content/s);
    expect(src).toMatch(/type="number" inputMode="numeric"[^>]*tech-content/s);
    expect(src).not.toMatch(/[٠-٩]/);
  });

  it('business identity username and phone pills force isolated LTR ordering', () => {
    const src = read('src/components/business/BusinessIdentityStrip.tsx');
    expect(src).toMatch(/dir="ltr"[\s\S]{0,180}technical-ltr/);
    expect(src).toMatch(/<span dir="ltr" className="tech-content font-medium">\{username\}<\/span>/);
    expect(src).toMatch(/href=\{`tel:\$\{phone\}`\}/);
    expect(src).toMatch(/dir="ltr"[\s\S]{0,220}technical-ltr[\s\S]{0,180}\{phone\}/);
  });

  it('footer technical contact values are explicit LTR instead of inheriting RTL', () => {
    const src = read('src/components/layout/footer/FooterBrand.tsx');
    expect(src).toMatch(/technical: true/);
    expect(src).toMatch(/dir=\{item\.technical \? "ltr" : "auto"\}/);
  });
});
