import { describe, it, expect } from 'vitest';
import { formatQuotaLabel } from '../membership-limits';

describe('formatQuotaLabel', () => {
  it('renders Arabic "من" between used and limit', () => {
    expect(formatQuotaLabel(3, 10, true)).toBe('3 من 10');
  });

  it('renders English slash form when isRTL=false', () => {
    expect(formatQuotaLabel(3, 10, false)).toBe('3 / 10');
  });

  it('treats limit=0 as unlimited (Arabic)', () => {
    expect(formatQuotaLabel(7, 0, true)).toBe('7 / غير محدود');
  });

  it('treats limit=0 as unlimited (English)', () => {
    expect(formatQuotaLabel(7, 0, false)).toBe('7 / Unlimited');
  });

  it('clamps negatives and non-finite values to 0', () => {
    expect(formatQuotaLabel(-5, 10, true)).toBe('0 من 10');
    expect(formatQuotaLabel(NaN, 10, true)).toBe('0 من 10');
    expect(formatQuotaLabel(3, -1, true)).toBe('3 / غير محدود');
  });

  it('defaults to RTL when isRTL omitted', () => {
    expect(formatQuotaLabel(2, 5)).toBe('2 من 5');
  });

  it('floors fractional values', () => {
    expect(formatQuotaLabel(2.9, 10.4, true)).toBe('2 من 10');
  });
});