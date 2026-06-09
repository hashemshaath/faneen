/**
 * Partner Showcase — unit & integration guards.
 *
 * Covers:
 * 1. `buildMarqueeSets` duplicates a short list to ≥6 logos and never
 *    leaves it empty.
 * 2. Mirror copy length matches primary so a -50% translate loops cleanly.
 * 3. Marquee CSS uses `transform` (NOT `width` / `left` / `right`).
 * 4. System-business items must link to `/${username ?? id}` and NEVER to
 *    `/q/...` (which is the barcode/quotation route, not a profile route).
 * 5. Component imports remain free of `vendor-charts` / `vendor-pdf`.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildMarqueeSets } from '@/components/home/v2/sections/PartnerShowcaseSection';

const sample = (n: number) =>
  Array.from({ length: n }).map((_, i) => ({
    id: `id-${i}`,
    source_type: 'external' as const,
    business_id: null,
    name_ar: `شريك ${i}`,
    name_en: `Partner ${i}`,
    logo_url: `https://cdn.example.com/${i}.png`,
    target_url: null,
    sort_order: i,
  }));

describe('PartnerShowcase: buildMarqueeSets', () => {
  it('returns empty sets for an empty list', () => {
    const { primary, mirror } = buildMarqueeSets([]);
    expect(primary).toEqual([]);
    expect(mirror).toEqual([]);
  });

  it('duplicates short lists so the marquee is dense (≥6 logos)', () => {
    const { primary } = buildMarqueeSets(sample(2));
    expect(primary.length).toBeGreaterThanOrEqual(6);
  });

  it('keeps long lists at their original length', () => {
    const { primary } = buildMarqueeSets(sample(10));
    expect(primary.length).toBe(10);
  });

  it('mirror copy length exactly matches primary so -50% translate loops seamlessly', () => {
    const { primary, mirror } = buildMarqueeSets(sample(3));
    expect(mirror.length).toBe(primary.length);
  });
});

describe('PartnerShowcase: CSS uses transform (no width/left/right animation)', () => {
  const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8');

  it('declares partner-marquee keyframes using transform: translateX', () => {
    expect(css).toMatch(/@keyframes partner-marquee-ltr[\s\S]*?transform:\s*translateX/);
    expect(css).toMatch(/@keyframes partner-marquee-rtl[\s\S]*?transform:\s*translateX/);
  });

  it('does NOT animate width/left/right inside partner-marquee keyframes', () => {
    const ltr = css.match(/@keyframes partner-marquee-ltr\s*{[\s\S]*?}\s*}/);
    const rtl = css.match(/@keyframes partner-marquee-rtl\s*{[\s\S]*?}\s*}/);
    for (const block of [ltr?.[0] ?? '', rtl?.[0] ?? '']) {
      expect(block).not.toMatch(/\b(width|left|right)\s*:/);
    }
  });

  it('respects prefers-reduced-motion by disabling the animation', () => {
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce[\s\S]*?\.partner-marquee-track[\s\S]*?animation:\s*none/);
  });
});

describe('PartnerShowcase admin: business linkage rules', () => {
  const adminSrc = readFileSync(
    resolve(__dirname, '../pages/admin/AdminPartnerShowcase.tsx'),
    'utf8',
  );

  it('builds business target URLs as `/${username ?? id}` — never `/q/`', () => {
    // Source must produce profile-style URLs.
    expect(adminSrc).toMatch(/`\/\$\{b\.username\}`/);
    expect(adminSrc).not.toMatch(/\/q\//);
  });

  it('blocks duplicates via linkedBusinessIds set', () => {
    expect(adminSrc).toMatch(/linkedBusinessIds\.has\(b\.id\)/);
  });
});

describe('PartnerShowcase: no heavy vendor chunks pulled into home', () => {
  const componentSrc = readFileSync(
    resolve(__dirname, '../components/home/v2/sections/PartnerShowcaseSection.tsx'),
    'utf8',
  );

  it('does not import recharts, jspdf, or any chart/pdf vendor', () => {
    expect(componentSrc).not.toMatch(/from\s+['"]recharts['"]/);
    expect(componentSrc).not.toMatch(/from\s+['"]jspdf['"]/);
    expect(componentSrc).not.toMatch(/vendor-charts|vendor-pdf/);
  });
});