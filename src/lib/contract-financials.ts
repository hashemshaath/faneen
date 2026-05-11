/**
 * Pure helpers for contract financial calculations.
 *
 * Single source of truth for VAT, line-item totals, measurement-derived totals,
 * and milestone/payment schedule reconciliation. Replaces the duplicated VAT
 * arithmetic that previously lived in three places:
 *   - src/pages/ContractDetail.tsx
 *   - src/pages/dashboard/DashboardContracts.tsx
 *   - src/lib/contract-pdf-export.ts
 *
 * Behavior preserved exactly from the previous implementation:
 *   - Inclusive VAT:  vat = total * rate / (100 + rate);  subtotal = total - vat
 *   - Exclusive VAT:  vat = total * rate / 100;           grand = total + vat
 *
 * Notes about contract value sourcing (see audit C2/C3):
 *   - `contract.total_amount` is the authoritative figure stored in the DB.
 *   - `contract_measurements` is currently the practical source of value when
 *     `contract_line_items` is empty (line_items table exists but is unused).
 *   - DB `total_amount` may differ from a measurement-derived display total
 *     until C3/C5 introduce auto-recalculation triggers.
 *
 * Rules:
 *   - Never returns NaN. All inputs go through `safeNum()`.
 *   - Negative computed amounts clamp to 0 (UI convention — flag via
 *     `validatePaymentScheduleTotal` instead).
 *   - All money values rounded to 2 decimals via `round2()`.
 */

const round2 = (n: number): number => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
const safeNum = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const clampNonNeg = (n: number): number => (n < 0 ? 0 : n);

export interface VatBreakdown {
  subtotal: number;      // amount before VAT
  vatAmount: number;     // VAT portion
  total: number;         // grand total including VAT
  vatRate: number;       // percentage, e.g. 15
  vatInclusive: boolean; // whether `amount` already included VAT
}

/**
 * Compute VAT breakdown from a single amount.
 * `amount` is interpreted as VAT-inclusive when `vatInclusive` is true,
 * otherwise as the pre-VAT subtotal.
 */
export function calculateVatBreakdown(input: {
  amount: number | string | null | undefined;
  vatRate?: number | string | null;
  vatInclusive?: boolean | null;
}): VatBreakdown {
  const amount = clampNonNeg(safeNum(input.amount));
  const vatRate = clampNonNeg(safeNum(input.vatRate ?? 15));
  const vatInclusive = !!input.vatInclusive;

  const vatAmount = vatInclusive
    ? (amount * vatRate) / (100 + vatRate)
    : (amount * vatRate) / 100;
  const subtotal = vatInclusive ? amount - vatAmount : amount;
  const total = vatInclusive ? amount : amount + vatAmount;

  return {
    subtotal: round2(subtotal),
    vatAmount: round2(vatAmount),
    total: round2(total),
    vatRate,
    vatInclusive,
  };
}

/* ── Aggregations ─────────────────────────────────────────────────────── */

export interface LineItemLike {
  quantity?: number | string | null;
  unit_price?: number | string | null;
  total_cost?: number | string | null;
}

/** Sum of `total_cost` if present, else `quantity * unit_price`. Never negative. */
export function calculateLineItemsTotal(items: LineItemLike[] | null | undefined): number {
  if (!Array.isArray(items)) return 0;
  const sum = items.reduce((acc, it) => {
    const explicit = safeNum(it.total_cost);
    const derived = safeNum(it.quantity) * safeNum(it.unit_price);
    return acc + clampNonNeg(explicit > 0 ? explicit : derived);
  }, 0);
  return round2(sum);
}

export interface MeasurementLike {
  quantity?: number | string | null;
  area_sqm?: number | string | null;
  unit_price?: number | string | null;
  total_cost?: number | string | null;
}

/**
 * Sum measurement totals.
 *
 * Formula (preserved from existing app behavior):
 *   When `total_cost` is present (>0) the DB-stored value wins.
 *   Otherwise we compute `quantity * area_sqm * unit_price`.
 *
 * `area_sqm` is in square meters; `unit_price` is per square meter.
 */
export function calculateMeasurementsTotal(rows: MeasurementLike[] | null | undefined): number {
  if (!Array.isArray(rows)) return 0;
  const sum = rows.reduce((acc, m) => {
    const explicit = safeNum(m.total_cost);
    if (explicit > 0) return acc + explicit;
    const derived = safeNum(m.quantity) * safeNum(m.area_sqm) * safeNum(m.unit_price);
    return acc + clampNonNeg(derived);
  }, 0);
  return round2(sum);
}

export interface MilestoneLike {
  amount?: number | string | null;
}
export function calculateMilestoneTotal(milestones: MilestoneLike[] | null | undefined): number {
  if (!Array.isArray(milestones)) return 0;
  return round2(milestones.reduce((s, m) => s + clampNonNeg(safeNum(m.amount)), 0));
}

/* ── Schedule reconciliation ──────────────────────────────────────────── */

export interface PaymentScheduleValidation {
  expectedTotal: number;
  actualTotal: number;
  difference: number;       // actual - expected (can be negative)
  isBalanced: boolean;
  tolerance: number;        // absolute tolerance applied
}

/**
 * Compares the sum of milestones/payments against the contract total.
 * Tolerance defaults to 0.01 (one halala / cent) for rounding safety.
 */
export function validatePaymentScheduleTotal(input: {
  totalAmount: number | string | null | undefined;
  paymentsOrMilestones: MilestoneLike[] | null | undefined;
  tolerance?: number;
}): PaymentScheduleValidation {
  const tolerance = input.tolerance ?? 0.01;
  const expectedTotal = round2(clampNonNeg(safeNum(input.totalAmount)));
  const actualTotal = calculateMilestoneTotal(input.paymentsOrMilestones);
  const difference = round2(actualTotal - expectedTotal);
  return {
    expectedTotal,
    actualTotal,
    difference,
    isBalanced: Math.abs(difference) <= tolerance,
    tolerance,
  };
}

/* ── Display ──────────────────────────────────────────────────────────── */

/**
 * Locale-aware money formatter. Uses `Intl.NumberFormat` with sane defaults.
 * Currency code is appended as plain text (not via the `currency` style) so the
 * SAR/AED/USD symbol policy stays consistent with the rest of the UI.
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currency: string = 'SAR',
  locale?: string,
): string {
  const n = round2(safeNum(amount));
  const loc = locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  const formatted = new Intl.NumberFormat(loc, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `${formatted} ${currency}`.trim();
}

/* ── Payment schedule presets (C3B) ───────────────────────────────────
 *
 * Pure helpers. No DB writes here. Consumed by the Payment Schedule
 * Generator UI to materialize installment_plans + installment_payments.
 *
 * Presets define percentages that MUST sum to 100. Generated row amounts
 * sum back to `totalAmount` exactly — the last row absorbs rounding drift
 * so the schedule never produces NaN, negatives, or over/undershoots.
 */

export interface PaymentPresetRow {
  percentage: number;     // 0..100
  title_ar: string;
  title_en: string;
  /** Days from `startDate` for the suggested due date. Optional. */
  dayOffset?: number;
}

export interface PaymentPreset {
  id: '30_40_30' | '50_50' | '100' | 'custom';
  label_ar: string;
  label_en: string;
  rows: PaymentPresetRow[];
}

export const PAYMENT_PRESETS: PaymentPreset[] = [
  {
    id: '30_40_30',
    label_ar: '30 / 40 / 30',
    label_en: '30 / 40 / 30',
    rows: [
      { percentage: 30, title_ar: 'دفعة مقدمة', title_en: 'Advance Payment', dayOffset: 0 },
      { percentage: 40, title_ar: 'دفعة منتصف المشروع', title_en: 'Mid-Project Payment', dayOffset: 30 },
      { percentage: 30, title_ar: 'دفعة نهائية', title_en: 'Final Payment', dayOffset: 60 },
    ],
  },
  {
    id: '50_50',
    label_ar: '50 / 50',
    label_en: '50 / 50',
    rows: [
      { percentage: 50, title_ar: 'دفعة مقدمة', title_en: 'Advance Payment', dayOffset: 0 },
      { percentage: 50, title_ar: 'دفعة نهائية', title_en: 'Final Payment', dayOffset: 30 },
    ],
  },
  {
    id: '100',
    label_ar: 'دفعة كاملة مقدماً',
    label_en: 'Full Upfront',
    rows: [
      { percentage: 100, title_ar: 'دفعة كاملة', title_en: 'Full Payment', dayOffset: 0 },
    ],
  },
];

export interface GeneratedPaymentRow {
  installment_number: number;
  title_ar: string;
  title_en: string;
  percentage: number;
  amount: number;
  due_date: string; // YYYY-MM-DD
  milestone_id: string | null;
}

export interface PercentageSumValidation {
  sum: number;          // sum of percentages (rounded to 2dp)
  isValid: boolean;     // |sum - 100| <= tolerance and no negatives
  hasNegative: boolean;
  tolerance: number;
}

/** Sum percentages and report whether they make a valid 100% schedule. */
export function validatePercentageSum(
  percentages: Array<number | string | null | undefined>,
  tolerance = 0.01,
): PercentageSumValidation {
  let sum = 0;
  let hasNegative = false;
  for (const p of percentages) {
    const n = safeNum(p);
    if (n < 0) hasNegative = true;
    sum += clampNonNeg(n);
  }
  sum = round2(sum);
  return {
    sum,
    hasNegative,
    tolerance,
    isValid: !hasNegative && Math.abs(sum - 100) <= tolerance,
  };
}

/**
 * Build a payment schedule from percentages + a contract total.
 *
 * - Rounds every row to 2dp.
 * - Last row absorbs the residual so the sum exactly equals `totalAmount`.
 * - Returns rows with positive amounts only; invalid input yields `[]`.
 */
export function generatePaymentSchedule(input: {
  totalAmount: number | string | null | undefined;
  rows: Array<Pick<PaymentPresetRow, 'percentage' | 'title_ar' | 'title_en' | 'dayOffset'>>;
  startDate?: Date | string;
  /** Optional explicit due dates per row (YYYY-MM-DD). Overrides dayOffset. */
  dueDates?: Array<string | undefined>;
  milestoneIds?: Array<string | null | undefined>;
}): GeneratedPaymentRow[] {
  const total = round2(clampNonNeg(safeNum(input.totalAmount)));
  if (total <= 0 || !Array.isArray(input.rows) || input.rows.length === 0) return [];

  const validation = validatePercentageSum(input.rows.map((r) => r.percentage));
  if (!validation.isValid) return [];

  const startDate = input.startDate ? new Date(input.startDate) : new Date();
  if (Number.isNaN(startDate.getTime())) startDate.setTime(Date.now());

  const out: GeneratedPaymentRow[] = [];
  let running = 0;

  input.rows.forEach((row, idx) => {
    const isLast = idx === input.rows.length - 1;
    const pct = clampNonNeg(safeNum(row.percentage));
    let amount = isLast ? round2(total - running) : round2((total * pct) / 100);
    if (amount < 0) amount = 0;
    running = round2(running + amount);

    const explicit = input.dueDates?.[idx];
    let dueDate: string;
    if (explicit && /^\d{4}-\d{2}-\d{2}$/.test(explicit)) {
      dueDate = explicit;
    } else {
      const d = new Date(startDate);
      d.setDate(d.getDate() + (row.dayOffset ?? 0));
      dueDate = d.toISOString().slice(0, 10);
    }

    out.push({
      installment_number: idx + 1,
      title_ar: row.title_ar,
      title_en: row.title_en,
      percentage: pct,
      amount,
      due_date: dueDate,
      milestone_id: input.milestoneIds?.[idx] ?? null,
    });
  });

  return out;
}