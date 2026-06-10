import { describe, it, expect } from 'vitest';
import { fmtNum, fmtCompact, fmtCurrency, fmtDate, fmtDateTime } from '@/lib/format';

const arabicIndicDigits = /[\u0660-\u0669\u06F0-\u06F9]/;

describe('Global Number/Codes Policy — Latin digits everywhere', () => {
  it('fmtNum returns Latin digits with grouping', () => {
    expect(fmtNum(1200)).toBe('1,200');
    expect(arabicIndicDigits.test(fmtNum(1234567))).toBe(false);
  });

  it('fmtCompact returns Latin digits', () => {
    expect(arabicIndicDigits.test(fmtCompact(12000))).toBe(false);
  });

  it('fmtCurrency returns Latin digits in SAR', () => {
    const out = fmtCurrency(250, 'SAR');
    expect(arabicIndicDigits.test(out)).toBe(false);
    expect(out).toMatch(/250/);
  });

  it('fmtDate uses Latin digits in both RTL and LTR contexts', () => {
    const d = new Date('2026-05-12T10:30:00Z');
    expect(arabicIndicDigits.test(fmtDate(d, true))).toBe(false);
    expect(arabicIndicDigits.test(fmtDate(d, false))).toBe(false);
  });

  it('fmtDateTime uses Latin digits in both RTL and LTR contexts', () => {
    const d = new Date('2026-05-12T10:30:00Z');
    expect(arabicIndicDigits.test(fmtDateTime(d, true))).toBe(false);
    expect(arabicIndicDigits.test(fmtDateTime(d, false))).toBe(false);
  });

  it('handles null/undefined safely', () => {
    expect(fmtNum(null)).toBe('—');
    expect(fmtCurrency(undefined)).toBe('—');
    expect(fmtDate(null, true)).toBe('—');
  });
});
