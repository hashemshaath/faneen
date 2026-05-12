/**
 * CT5A — Contract Pricing Engine (foundation).
 *
 * Pure, side-effect-free helpers for calculating contract line item totals
 * across the supported pricing methods. No DB calls, no formula execution.
 *
 * Supported methods (CT5A scope):
 *   unit, linear_meter, square_meter, cubic_meter, kilogram, ton, lump_sum
 *
 * Deferred (return ok:false with errorCode='unsupported_method'):
 *   custom_formula, mixed, itemized_boq, milestone
 */

export type PricingMethod =
  | 'unit'
  | 'linear_meter'
  | 'square_meter'
  | 'cubic_meter'
  | 'kilogram'
  | 'ton'
  | 'lump_sum';

export const SUPPORTED_PRICING_METHODS: PricingMethod[] = [
  'unit',
  'linear_meter',
  'square_meter',
  'cubic_meter',
  'kilogram',
  'ton',
  'lump_sum',
];

const MAX_DIMENSION_MM = 1_000_000_000;
const MAX_QUANTITY = 1_000_000;
const MAX_WEIGHT = 1_000_000;
const MAX_UNIT_PRICE = 1_000_000_000;
const MAX_TOTAL = 1_000_000_000_000;

export interface PricingInput {
  pricing_method?: string | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  formula_inputs?: Record<string, unknown> | null;
}

export interface PricingResult {
  ok: boolean;
  total: number;
  normalized: Record<string, number>;
  errorCode?:
    | 'unsupported_method'
    | 'invalid_number'
    | 'negative_value'
    | 'missing_dimension'
    | 'value_too_large'
    | 'total_too_large';
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function normalizeMeasurementInput(input: PricingInput): Record<string, number> {
  const inputs = input.formula_inputs ?? {};
  const out: Record<string, number> = {};
  const keys = ['length_mm', 'width_mm', 'height_mm', 'weight_kg', 'weight_ton', 'amount'] as const;
  for (const k of keys) {
    const n = toNumber((inputs as Record<string, unknown>)[k]);
    if (n !== null) out[k] = n;
  }
  const q = toNumber(input.quantity);
  if (q !== null) out.quantity = q;
  const up = toNumber(input.unit_price);
  if (up !== null) out.unit_price = up;
  return out;
}

function fail(code: NonNullable<PricingResult['errorCode']>, normalized: Record<string, number>): PricingResult {
  return { ok: false, total: 0, normalized, errorCode: code };
}

export function validatePricingInput(input: PricingInput): PricingResult {
  return calculateLineTotal(input);
}

export function calculateLineTotal(input: PricingInput): PricingResult {
  const method = (input.pricing_method ?? 'unit') as string;
  const n = normalizeMeasurementInput(input);

  if (!SUPPORTED_PRICING_METHODS.includes(method as PricingMethod)) {
    return fail('unsupported_method', n);
  }

  for (const [k, v] of Object.entries(n)) {
    if (!Number.isFinite(v)) return fail('invalid_number', n);
    if (v < 0) return fail('negative_value', n);
    if (k.endsWith('_mm') && v > MAX_DIMENSION_MM) return fail('value_too_large', n);
    if (k === 'quantity' && v > MAX_QUANTITY) return fail('value_too_large', n);
    if ((k === 'weight_kg' || k === 'weight_ton') && v > MAX_WEIGHT) return fail('value_too_large', n);
    if ((k === 'unit_price' || k === 'amount') && v > MAX_UNIT_PRICE) return fail('value_too_large', n);
  }

  const qty = n.quantity ?? 1;
  const up = n.unit_price ?? 0;
  let total = 0;

  switch (method as PricingMethod) {
    case 'unit':
      total = qty * up;
      break;
    case 'linear_meter': {
      const L = n.length_mm;
      if (L === undefined) return fail('missing_dimension', n);
      total = (L / 1000) * qty * up;
      break;
    }
    case 'square_meter': {
      const L = n.length_mm;
      const W = n.width_mm;
      if (L === undefined || W === undefined) return fail('missing_dimension', n);
      total = (L * W / 1_000_000) * qty * up;
      break;
    }
    case 'cubic_meter': {
      const L = n.length_mm;
      const W = n.width_mm;
      const H = n.height_mm;
      if (L === undefined || W === undefined || H === undefined) return fail('missing_dimension', n);
      total = (L * W * H / 1_000_000_000) * qty * up;
      break;
    }
    case 'kilogram': {
      const w = n.weight_kg;
      if (w === undefined) return fail('missing_dimension', n);
      total = w * up;
      break;
    }
    case 'ton': {
      const w = n.weight_ton;
      if (w === undefined) return fail('missing_dimension', n);
      total = w * up;
      break;
    }
    case 'lump_sum': {
      total = n.amount ?? up;
      break;
    }
  }

  if (!Number.isFinite(total)) return fail('invalid_number', n);
  if (total < 0) return fail('negative_value', n);
  if (total > MAX_TOTAL) return fail('total_too_large', n);

  return { ok: true, total: round2(total), normalized: n };
}

export function formatPricingMethodLabel(method: string | null | undefined, locale: 'ar' | 'en' = 'ar'): string {
  const ar: Record<string, string> = {
    unit: 'بالوحدة',
    linear_meter: 'متر طولي',
    square_meter: 'متر مربع',
    cubic_meter: 'متر مكعب',
    kilogram: 'كيلوجرام',
    ton: 'طن',
    lump_sum: 'سعر مقطوع',
    milestone: 'مرحلي',
    itemized_boq: 'جدول كميات',
    custom_formula: 'صيغة مخصصة',
    mixed: 'مختلط',
  };
  const en: Record<string, string> = {
    unit: 'Per Unit',
    linear_meter: 'Linear Meter',
    square_meter: 'Square Meter',
    cubic_meter: 'Cubic Meter',
    kilogram: 'Kilogram',
    ton: 'Ton',
    lump_sum: 'Lump Sum',
    milestone: 'Milestone',
    itemized_boq: 'BOQ',
    custom_formula: 'Custom Formula',
    mixed: 'Mixed',
  };
  const m = method || 'unit';
  return (locale === 'ar' ? ar[m] : en[m]) || m;
}

export function formatUnitOfMeasure(method: string | null | undefined): string {
  switch (method) {
    case 'linear_meter': return 'm';
    case 'square_meter': return 'm\u00B2';
    case 'cubic_meter': return 'm\u00B3';
    case 'kilogram': return 'kg';
    case 'ton': return 't';
    case 'lump_sum': return '\u2014';
    case 'unit':
    default: return 'pcs';
  }
}
