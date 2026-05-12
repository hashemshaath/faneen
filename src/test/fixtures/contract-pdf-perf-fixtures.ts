/**
 * PDF-PERF1 — Performance benchmark fixtures.
 *
 * SAFE DUMMY DATA ONLY. No real PII / IDs / storage paths.
 * Five shapes covering small / medium BOQ / large BOQ / legal-heavy /
 * amendment-heavy contracts.
 */
import type { ContractExportData } from '@/lib/contract-pdf-export';

const baseParties = {
  clientName: 'Demo Client LLC',
  providerName: 'Demo Provider Co.',
  businessName: 'Demo Business',
  currency: 'SAR',
  vatRate: 15,
  vatInclusive: true,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  milestones: [],
};

const ar = (s: string) => s; // placeholder so the literal stays Arabic-clean
const longArabicClause =
  'هذا بند طويل يحتوي على شروط ومواصفات تفصيلية تشمل المواد المستخدمة وطرق التركيب والضمانات والصيانة والتسليم والاستلام والمسؤوليات المتبادلة بين الطرفين، ويُكرَّر بهدف اختبار التغليف الصحيح للنص العربي في ملف PDF. ';

function makeLineItems(
  count: number,
  groups: number,
  longNames = false,
): NonNullable<ContractExportData['lineItems']> {
  const items: NonNullable<ContractExportData['lineItems']> = [];
  const methods = ['square_meter', 'unit', 'linear_meter', 'lump_sum'] as const;
  const units = ['m²', 'pcs', 'm', '—'];
  for (let i = 0; i < count; i++) {
    const g = i % groups;
    const m = i % methods.length;
    const qty = 1 + (i % 9);
    const price = 100 + ((i * 37) % 2400);
    items.push({
      nameAr: longNames
        ? `بند رقم ${i + 1} — وصف تفصيلي للعنصر الصناعي ضمن المجموعة ${g + 1}`
        : `بند ${i + 1}`,
      nameEn: longNames
        ? `Item #${i + 1} — Detailed industrial description for group ${g + 1}`
        : `Item ${i + 1}`,
      pricingMethod: methods[m],
      unitOfMeasure: units[m],
      boqGroupKey: `group_${g + 1}`,
      quantity: qty,
      unitPrice: price,
      totalCost: qty * price,
    });
  }
  return items;
}

const baseTemplate = {
  nameAr: ar('قالب اختبار الأداء'),
  nameEn: 'Performance test template',
  versionNumber: 1,
  category: 'aluminum' as const,
  pricingMethod: 'square_meter' as const,
  languagePrecedence: 'ar' as const,
};

export const smallContractPerf: ContractExportData = {
  ...baseParties,
  contractNumber: 'PERF-S-001',
  title: 'Small contract',
  totalAmount: 5_000,
  isRTL: false,
  template: null,
  templateSnapshot: null,
  lineItems: makeLineItems(5, 1),
};

export const mediumBoqPerf: ContractExportData = {
  ...baseParties,
  contractNumber: 'PERF-M-002',
  title: 'Medium BOQ contract',
  totalAmount: 60_000,
  isRTL: false,
  template: baseTemplate,
  templateSnapshot: {
    sections: [{
      title_ar: 'الشروط العامة', title_en: 'General Terms',
      sort_order: 1, is_required: true,
      clauses: [
        { body_ar: 'يلتزم المزود بالتسليم في الموعد.', body_en: 'Provider shall deliver on time.', sort_order: 1, is_mandatory: true },
        { body_ar: 'الضمان لمدة سنة.', body_en: 'Warranty: one year.', sort_order: 2, is_mandatory: false },
      ],
    }],
    attachments: [
      { kind: 'boq', title_ar: 'جدول الكميات', title_en: 'BOQ', precedence_order: 1, is_mandatory: true },
    ],
  },
  lineItems: makeLineItems(50, 5),
  documentHash: 'a'.repeat(64),
  verifyOrigin: 'https://qitaat.com',
};

export const largeBoqPerf: ContractExportData = {
  ...baseParties,
  contractNumber: 'PERF-L-003',
  title: 'Large BOQ contract',
  totalAmount: 250_000,
  isRTL: true,
  template: baseTemplate,
  templateSnapshot: {
    sections: [{
      title_ar: 'الشروط', sort_order: 1, is_required: true,
      clauses: [
        { body_ar: longArabicClause, sort_order: 1, is_mandatory: true },
      ],
    }],
    attachments: [
      { kind: 'boq', title_ar: 'جدول الكميات', title_en: 'BOQ', precedence_order: 1, is_mandatory: true },
    ],
  },
  lineItems: makeLineItems(150, 8, true),
  documentHash: 'b'.repeat(64),
  verifyOrigin: 'https://qitaat.com',
};

export const legalHeavyPerf: ContractExportData = {
  ...baseParties,
  contractNumber: 'PERF-LEG-004',
  title: 'Legal-heavy contract',
  totalAmount: 30_000,
  isRTL: true,
  template: baseTemplate,
  templateSnapshot: {
    sections: Array.from({ length: 6 }).map((_, sIdx) => ({
      title_ar: `قسم ${sIdx + 1}`,
      sort_order: sIdx + 1,
      is_required: true,
      clauses: Array.from({ length: 8 }).map((__, cIdx) => ({
        body_ar: longArabicClause.repeat(2),
        sort_order: cIdx + 1,
        is_mandatory: cIdx === 0,
      })),
    })),
    attachments: [
      { kind: 'amendment', title_ar: 'الملحق المعتمد', title_en: 'Approved amendment', precedence_order: 1, is_mandatory: true },
      { kind: 'boq', title_ar: 'جدول الكميات', title_en: 'BOQ', precedence_order: 2, is_mandatory: true },
    ],
  },
  lineItems: makeLineItems(20, 3),
  documentHash: 'c'.repeat(64),
  verifyOrigin: 'https://qitaat.com',
};

export const amendmentHeavyPerf: ContractExportData = {
  ...baseParties,
  contractNumber: 'PERF-AMD-005',
  title: 'Amendment-heavy contract',
  totalAmount: 75_000,
  isRTL: false,
  template: baseTemplate,
  templateSnapshot: { sections: [], attachments: [] },
  lineItems: makeLineItems(25, 4),
  documentHash: 'd'.repeat(64),
  verifyOrigin: 'https://qitaat.com',
  amendments: Array.from({ length: 10 }).map((_, i) => ({
    number: i + 1,
    createdAt: `2026-0${(i % 9) + 1}-15`,
    type: i % 2 === 0 ? 'amount_change' : 'date_change',
    status: i % 3 === 0 ? 'pending' : 'applied',
    title: `Amendment #${i + 1}`,
    reason: 'Routine adjustment for performance benchmarking only.',
    oldTotal: 75_000 + i * 1_000,
    newAmount: 75_000 + (i + 1) * 1_000,
    amountDelta: 1_000,
    appliedAt: `2026-0${(i % 9) + 1}-20`,
  })),
};

export const PERF_FIXTURES = {
  small:        smallContractPerf,
  mediumBoq:    mediumBoqPerf,
  largeBoq:     largeBoqPerf,
  legalHeavy:   legalHeavyPerf,
  amendmentHeavy: amendmentHeavyPerf,
} as const;

export type PerfFixtureName = keyof typeof PERF_FIXTURES;

// Performance budgets (ms) — informational, asserted softly.
export const PERF_BUDGETS_MS: Record<PerfFixtureName, number> = {
  small:          1000,
  mediumBoq:      3000,
  largeBoq:       8000,
  legalHeavy:    15000,
  amendmentHeavy: 8000,
};
