/**
 * Contracts Phase 4A — Draft Completeness Score (pure helper).
 *
 * UI-only guidance derived from current form state. Does not block
 * Save Draft, does not change pricing, PDF, amendments, or RLS.
 */

export type CompletenessStep =
  | 'client'
  | 'work'
  | 'template'
  | 'details'
  | 'pricing'
  | 'review';

export type CompletenessStatus = 'low' | 'medium' | 'good' | 'complete';

export interface CompletenessMissing {
  key: string;
  labelAr: string;
  labelEn: string;
  step: CompletenessStep;
}

export interface CompletenessInput {
  hasClient: boolean;
  hasWorkType: boolean;
  hasTemplate: boolean;
  titleAr?: string;
  titleEn?: string;
  startDate?: string;
  endDate?: string;
  vatRate?: string | number;
  totalAmount?: string | number;
  lineItemsCount?: number;
  measurementsCount?: number;
  termsAr?: string;
  termsEn?: string;
  hasTemplateSnapshot?: boolean;
}

export interface CompletenessResult {
  score: number;
  status: CompletenessStatus;
  missing: CompletenessMissing[];
  completed: string[];
}

interface Rule {
  key: string;
  weight: number;
  step: CompletenessStep;
  labelAr: string;
  labelEn: string;
  passed: (i: CompletenessInput) => boolean;
}

const num = (v: unknown): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

export function calculateContractCompleteness(
  input: CompletenessInput,
): CompletenessResult {
  const rules: Rule[] = [
    {
      key: 'client', weight: 18, step: 'client',
      labelAr: 'اختيار العميل', labelEn: 'Select client',
      passed: (i) => i.hasClient,
    },
    {
      key: 'work_type', weight: 8, step: 'work',
      labelAr: 'نوع العمل', labelEn: 'Work type',
      passed: (i) => i.hasWorkType,
    },
    {
      key: 'template', weight: 16, step: 'template',
      labelAr: 'قالب عقد منشور', labelEn: 'Published template',
      passed: (i) => i.hasTemplate,
    },
    {
      key: 'title', weight: 14, step: 'details',
      labelAr: 'عنوان العقد', labelEn: 'Contract title',
      passed: (i) => !!(i.titleAr?.trim() || i.titleEn?.trim()),
    },
    {
      key: 'start_date', weight: 7, step: 'details',
      labelAr: 'تاريخ البدء', labelEn: 'Start date',
      passed: (i) => !!i.startDate,
    },
    {
      key: 'end_date', weight: 7, step: 'details',
      labelAr: 'تاريخ الانتهاء', labelEn: 'End date',
      passed: (i) => !!i.endDate,
    },
    {
      key: 'vat_rate', weight: 5, step: 'pricing',
      labelAr: 'نسبة الضريبة صحيحة', labelEn: 'Valid VAT rate',
      passed: (i) => {
        const n = num(i.vatRate);
        return n >= 0 && n <= 100;
      },
    },
    {
      key: 'pricing_source', weight: 15, step: 'pricing',
      labelAr: 'مصدر تسعير (مبلغ أو بند أو مقاس)',
      labelEn: 'Pricing source (amount, line item, or measurement)',
      passed: (i) =>
        num(i.totalAmount) > 0 ||
        (i.lineItemsCount ?? 0) > 0 ||
        (i.measurementsCount ?? 0) > 0,
    },
    {
      key: 'terms', weight: 6, step: 'pricing',
      labelAr: 'الشروط والأحكام', labelEn: 'Terms & conditions',
      passed: (i) =>
        !!(i.termsAr?.trim() || i.termsEn?.trim() || i.hasTemplateSnapshot),
    },
    {
      key: 'review_ok', weight: 4, step: 'review',
      labelAr: 'لا حقول حرجة ناقصة', labelEn: 'No critical fields missing',
      passed: (i) =>
        i.hasClient && i.hasTemplate &&
        !!(i.titleAr?.trim() || i.titleEn?.trim()) &&
        num(i.totalAmount) > 0,
    },
  ];

  const totalWeight = rules.reduce((s, r) => s + r.weight, 0);
  let earned = 0;
  const missing: CompletenessMissing[] = [];
  const completed: string[] = [];

  for (const r of rules) {
    if (r.passed(input)) {
      earned += r.weight;
      completed.push(r.key);
    } else {
      missing.push({ key: r.key, labelAr: r.labelAr, labelEn: r.labelEn, step: r.step });
    }
  }

  const score = Math.round((earned / totalWeight) * 100);
  let status: CompletenessStatus = 'low';
  if (score >= 100) status = 'complete';
  else if (score >= 80) status = 'good';
  else if (score >= 50) status = 'medium';

  return { score, status, missing, completed };
}