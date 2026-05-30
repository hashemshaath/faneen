import { describe, it, expect } from 'vitest';
import { buildCsv, sanitizeCsvCell, defaultRange } from '../admin-reports-csv';

describe('admin-reports-csv', () => {
  it('sanitizes commas and quotes', () => {
    expect(sanitizeCsvCell('hello, world')).toBe('"hello, world"');
    expect(sanitizeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(sanitizeCsvCell(null)).toBe('');
    expect(sanitizeCsvCell(42)).toBe('42');
  });

  it('builds csv with BOM and headers', () => {
    const out = buildCsv(
      [{ a: 1, b: 'x' }, { a: 2, b: 'y,z' }],
      ['a', 'b'] as const,
    );
    expect(out.startsWith('\uFEFF')).toBe(true);
    expect(out).toContain('a,b');
    expect(out).toContain('1,x');
    expect(out).toContain('2,"y,z"');
  });

  it('produces an inclusive date range', () => {
    const r = defaultRange(7);
    expect(r.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(r.to).getTime()).toBeGreaterThan(new Date(r.from).getTime());
  });
});