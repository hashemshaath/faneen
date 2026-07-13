import type { RentalUnit } from '../types';

/**
 * Compute a rental total. `days` is required for time-based units (day/hour);
 * for quantity units (piece/m/m2/unit) days defaults to 1 in the calculation.
 */
export function calcTotal(input: {
  unit: RentalUnit;
  unitPrice: number;
  quantity: number;
  days: number;
}): number {
  const { unit, unitPrice, quantity, days } = input;
  const qty = Math.max(0, quantity);
  const d = Math.max(1, days);
  const p = Math.max(0, unitPrice);
  switch (unit) {
    case 'day':
    case 'hour':
      return +(p * qty * d).toFixed(2);
    case 'piece':
    case 'm':
    case 'm2':
    case 'unit':
      return +(p * qty).toFixed(2);
    default:
      return +(p * qty * d).toFixed(2);
  }
}

/**
 * T1 — Customer-facing rental request price preview.
 *
 * Given the item's base rate (already stored per-unit) plus rate hints for
 * weekly/monthly discounts (optional), pick the best applicable tier for the
 * requested `days`, then add delivery fee. Returns a full breakdown suitable
 * for inline display in the request form and for snapshot into
 * `rental_orders.terms_snapshot`.
 *
 * Rules (deterministic, unit-tested):
 *  - `days` <= 0 is treated as 1 (min-billable).
 *  - Weekly rate applies whole-week when days >= 7 AND weeklyRate given.
 *    Any trailing days beyond full weeks are billed at daily rate.
 *  - Monthly rate applies whole-month (30d) when days >= 30 AND monthlyRate
 *    given. Any trailing days are billed at (weekly if applicable else daily).
 *  - Quantity multiplies the per-item subtotal.
 *  - Deposit is per-item × quantity, NOT time-scaled.
 *  - Delivery fee is a single flat add-on, only when `deliveryRequired`.
 */
export interface RentalPricePreviewInput {
  unit: RentalUnit;
  baseDailyRate: number;
  weeklyRate?: number | null;
  monthlyRate?: number | null;
  quantity: number;
  days: number;
  depositPerUnit?: number | null;
  deliveryRequired?: boolean;
  deliveryFee?: number | null;
}

export interface RentalPricePreview {
  timeUnitsBreakdown: { months: number; weeks: number; days: number };
  rentalSubtotal: number;
  deliveryTotal: number;
  depositTotal: number;
  grandTotal: number;
}

export function computeRentalPricePreview(
  input: RentalPricePreviewInput,
): RentalPricePreview {
  const qty = Math.max(0, input.quantity);
  const days = Math.max(1, Math.floor(input.days));
  const daily = Math.max(0, input.baseDailyRate || 0);
  const weekly = input.weeklyRate && input.weeklyRate > 0 ? input.weeklyRate : null;
  const monthly = input.monthlyRate && input.monthlyRate > 0 ? input.monthlyRate : null;

  // Quantity-only units (piece/m/m2/unit) — time collapses to 1.
  if (input.unit === 'piece' || input.unit === 'm' || input.unit === 'm2' || input.unit === 'unit') {
    const rentalSubtotal = +(daily * qty).toFixed(2);
    const depositTotal = +((input.depositPerUnit ?? 0) * qty).toFixed(2);
    const deliveryTotal = input.deliveryRequired ? +(input.deliveryFee ?? 0).toFixed(2) : 0;
    return {
      timeUnitsBreakdown: { months: 0, weeks: 0, days: 1 },
      rentalSubtotal,
      deliveryTotal,
      depositTotal,
      grandTotal: +(rentalSubtotal + depositTotal + deliveryTotal).toFixed(2),
    };
  }

  // Time-based units — greedy monthly → weekly → daily using discount tiers
  // (falls back to daily-only when no weekly/monthly hints provided).
  let remaining = days;
  let months = 0;
  let weeks = 0;
  if (monthly) {
    months = Math.floor(remaining / 30);
    remaining -= months * 30;
  }
  if (weekly) {
    weeks = Math.floor(remaining / 7);
    remaining -= weeks * 7;
  }
  const perUnitSubtotal =
    (monthly ? months * monthly : 0) +
    (weekly ? weeks * weekly : 0) +
    remaining * daily;
  const rentalSubtotal = +(perUnitSubtotal * qty).toFixed(2);
  const depositTotal = +((input.depositPerUnit ?? 0) * qty).toFixed(2);
  const deliveryTotal = input.deliveryRequired ? +(input.deliveryFee ?? 0).toFixed(2) : 0;
  return {
    timeUnitsBreakdown: { months, weeks, days: remaining },
    rentalSubtotal,
    deliveryTotal,
    depositTotal,
    grandTotal: +(rentalSubtotal + depositTotal + deliveryTotal).toFixed(2),
  };
}