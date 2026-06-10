import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const files = [
  'src/components/business-profile/BusinessProfileHeader.tsx',
  'src/components/business-profile/OverviewTab.tsx',
  'src/components/business-profile/BusinessProfileTabs.tsx',
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
});
