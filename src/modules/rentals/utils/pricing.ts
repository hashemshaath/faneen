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