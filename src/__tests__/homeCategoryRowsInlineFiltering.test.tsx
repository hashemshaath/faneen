import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HOME_CATEGORY_ROWS } from '@/components/home/v2/data/categoryRows';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

/**
 * HOME-ROWS-INLINE-FILTER — chips inside each home category row must
 * filter providers in place, never navigate. "View all" is a chip
 * (filter reset). Cross-row navigation uses a separately named CTA.
 */
describe('Home category rows — inline filtering', () => {
  const rowSrc = read('src/components/home/v2/sections/HomeCategoryRow.tsx');
  const rowsSrc = read('src/components/home/v2/sections/HomeCategoryRows.tsx');
  const allSrc = `${rowSrc}\n${rowsSrc}`;

  const steel = HOME_CATEGORY_ROWS.find((r) => r.id === 'steel-stainless');

  it('exposes the steel/stainless/metals row', () => {
    expect(steel).toBeDefined();
    expect(steel!.titleAr).toBe('الحديد والستانلس والمعادن');
    expect(steel!.subAr).toBe('درابزين، أبواب، هياكل معدنية وأعمال خاصة.');
  });

  it('declares the four required inline chip filters on the metals row', () => {
    const labels = steel!.items.map((i) => i.ar);
    expect(labels).toEqual(
      expect.arrayContaining(['حديد ومعادن', 'ستانلس ستيل', 'درابزين', 'هياكل معدنية']),
    );
  });

  it('chips are <button> elements (no <Link to=> chip and no /search inline)', () => {
    // Filter chips iterate row.items with role="tab" buttons, never <Link>.
    expect(rowSrc).toMatch(/row\.items\.map[\s\S]{0,200}<button/);
    expect(rowSrc).not.toMatch(/<Link[^>]+chipHref/);
    expect(rowSrc).not.toMatch(/\/search\?category=/);
    expect(rowSrc).not.toMatch(/\/search\?q=/);
  });

  it('"View all" is a filter-reset button, not a route link', () => {
    expect(rowSrc).toMatch(/setActiveFilter\(ALL_FILTER\)/);
    // The chip row must contain a button labelled "عرض الكل" (filter).
    expect(rowSrc).toMatch(/<button[\s\S]{0,400}عرض الكل/);
  });

  it('exposes a separately-named navigation CTA (not "View all")', () => {
    expect(rowSrc).toMatch(/استعرض كل النتائج/);
    expect(rowSrc).toMatch(/Browse all results/);
  });

  it('highlights the active filter via aria-selected and a styled class', () => {
    expect(rowSrc).toMatch(/aria-selected=\{active\}/);
    expect(rowSrc).toMatch(/chipActive/);
  });

  it('passes per-slug provider buckets from the loader for inline filtering', () => {
    expect(rowsSrc).toMatch(/providersBySlug=\{businessesBySlug\}/);
    expect(rowSrc).toMatch(/providersBySlug/);
  });

  it('has no hardcoded hex colors', () => {
    expect(allSrc).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('has no any / as any / suppressions', () => {
    expect(allSrc).not.toMatch(/\bas\s+any\b/);
    expect(allSrc).not.toMatch(/:\s*any\b/);
    expect(allSrc).not.toMatch(/@ts-(ignore|expect-error)/);
    expect(allSrc).not.toMatch(/eslint-disable/);
  });
});