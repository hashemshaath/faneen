/**
 * T1 — computeRentalPricePreview unit test.
 *
 * Locks the deterministic pricing rules the customer request form and the
 * price preview surface depend on: daily/weekly/monthly greedy tiering,
 * quantity-only units, deposit is per-item × qty (not time-scaled), and
 * delivery is a single flat add-on gated by `deliveryRequired`.
 */
import { describe, it, expect } from 'vitest';
import { computeRentalPricePreview } from '../utils/pricing';

describe('computeRentalPricePreview', () => {
  it('day unit — daily only when no weekly/monthly hints', () => {
    const r = computeRentalPricePreview({
      unit: 'day', baseDailyRate: 100, quantity: 2, days: 5,
    });
    expect(r.timeUnitsBreakdown).toEqual({ months: 0, weeks: 0, days: 5 });
    expect(r.rentalSubtotal).toBe(1000); // 100 * 2 * 5
    expect(r.depositTotal).toBe(0);
    expect(r.deliveryTotal).toBe(0);
    expect(r.grandTotal).toBe(1000);
  });

  it('day unit — greedy weekly tier applies when days >= 7', () => {
    // 10 days, daily=100, weekly=500 (=71.42/d equiv). 1 week + 3 days.
    const r = computeRentalPricePreview({
      unit: 'day', baseDailyRate: 100, weeklyRate: 500, quantity: 1, days: 10,
    });
    expect(r.timeUnitsBreakdown).toEqual({ months: 0, weeks: 1, days: 3 });
    // 500 + 3*100 = 800
    expect(r.rentalSubtotal).toBe(800);
  });

  it('day unit — monthly + weekly + daily stack correctly', () => {
    // 40 days, monthly=2000 (30d), weekly=500 (7d), daily=100
    // → 1 month (30d) + 1 week (7d) + 3 days = 2000 + 500 + 300 = 2800
    const r = computeRentalPricePreview({
      unit: 'day', baseDailyRate: 100, weeklyRate: 500, monthlyRate: 2000,
      quantity: 1, days: 40,
    });
    expect(r.timeUnitsBreakdown).toEqual({ months: 1, weeks: 1, days: 3 });
    expect(r.rentalSubtotal).toBe(2800);
  });

  it('quantity-only unit — collapses time to 1', () => {
    const r = computeRentalPricePreview({
      unit: 'piece', baseDailyRate: 50, quantity: 4, days: 999, // days ignored
    });
    expect(r.timeUnitsBreakdown).toEqual({ months: 0, weeks: 0, days: 1 });
    expect(r.rentalSubtotal).toBe(200); // 50 * 4
  });

  it('deposit is per-unit × qty, NOT time-scaled', () => {
    const r = computeRentalPricePreview({
      unit: 'day', baseDailyRate: 100, quantity: 3, days: 14, depositPerUnit: 200,
    });
    expect(r.depositTotal).toBe(600); // 200 * 3 (not × days)
    expect(r.rentalSubtotal).toBe(100 * 3 * 14);
    expect(r.grandTotal).toBe(600 + 100 * 3 * 14);
  });

  it('delivery fee added only when deliveryRequired', () => {
    const off = computeRentalPricePreview({
      unit: 'day', baseDailyRate: 100, quantity: 1, days: 3,
      deliveryRequired: false, deliveryFee: 250,
    });
    expect(off.deliveryTotal).toBe(0);
    expect(off.grandTotal).toBe(300);

    const on = computeRentalPricePreview({
      unit: 'day', baseDailyRate: 100, quantity: 1, days: 3,
      deliveryRequired: true, deliveryFee: 250,
    });
    expect(on.deliveryTotal).toBe(250);
    expect(on.grandTotal).toBe(300 + 250);
  });

  it('clamps days to min 1 and quantity to min 0', () => {
    const r = computeRentalPricePreview({
      unit: 'day', baseDailyRate: 100, quantity: 0, days: 0,
    });
    expect(r.rentalSubtotal).toBe(0);
    expect(r.grandTotal).toBe(0);
  });
});