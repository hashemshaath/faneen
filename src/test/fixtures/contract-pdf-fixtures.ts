/**
 * PDF-QA1 — Contract PDF export test fixtures.
 *
 * SAFE DUMMY DATA ONLY. No real PII, no real storage paths, no real IDs.
 * Fixtures intentionally cover the shapes most likely to break the export
 * pipeline or leak private fields:
 *
 *   - legacy normalized contract (no template, no BOQ groups)
 *   - templated contract (template + frozen snapshot + line items)
 *   - kitchen-style BOQ contract (mixed pricing methods + groups)
 *   - long Arabic clauses (RTL wrapping + font fallback)
 *   - amendment data (amendments appendix)
 *   - QR / document_hash (verification block)
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
  endDate: '2026-06-30',
  milestones: [],
};

export const legacyContractFixture: ContractExportData = {
  ...baseParties,
  contractNumber: 'CT-LEGACY-0001',
  title: 'Legacy normalized contract',
  description: 'Pre-CT6 contract normalized by CT8 migration.',
  totalAmount: 11500,
  isRTL: false,
  template: null,
  templateSnapshot: null,
  lineItems: [],
};

export const templatedContractFixture: ContractExportData = {
  ...baseParties,
  contractNumber: 'CT-TPL-0002',
  title: 'Templated aluminum facade contract',
  totalAmount: 23000,
  isRTL: false,
  template: {
    nameAr: 'قالب الواجهات الألمنيوم',
    nameEn: 'Aluminum Facade Template',
    versionNumber: 3,
    category: 'aluminum',
    pricingMethod: 'square_meter',
    languagePrecedence: 'ar',
  },
  templateSnapshot: {
    sections: [
      {
        title_ar: 'الشروط العامة',
        title_en: 'General Terms',
        sort_order: 1,
        is_required: true,
        clauses: [
          { body_ar: 'يلتزم المزود بالتسليم في الموعد.', body_en: 'Provider shall deliver on time.', sort_order: 1, is_mandatory: true },
          { body_ar: 'الضمان لمدة سنة.', body_en: 'Warranty: one year.', sort_order: 2, is_mandatory: false },
        ],
      },
    ],
    attachments: [
      { kind: 'amendment',  title_ar: 'الملحق المعتمد', title_en: 'Approved amendment', precedence_order: 1, is_mandatory: true },
      { kind: 'boq',         title_ar: 'جدول الكميات',    title_en: 'BOQ',                precedence_order: 2, is_mandatory: true },
    ],
  },
  lineItems: [
    {
      nameAr: 'نافذة ألمنيوم',
      nameEn: 'Aluminum window',
      pricingMethod: 'square_meter',
      unitOfMeasure: 'm²',
      boqGroupKey: 'windows',
      quantity: 4,
      unitPrice: 1500,
      totalCost: 6000,
      formulaInputs: { length_mm: 1500, width_mm: 1000 },
    },
    {
      nameAr: 'باب رئيسي',
      nameEn: 'Main door',
      pricingMethod: 'unit',
      unitOfMeasure: 'pcs',
      boqGroupKey: 'doors',
      quantity: 1,
      unitPrice: 17000,
      totalCost: 17000,
    },
  ],
};

export const kitchenBoqFixture: ContractExportData = {
  ...baseParties,
  contractNumber: 'CT-KIT-0003',
  title: 'Kitchen — mixed pricing BOQ',
  totalAmount: 41250,
  isRTL: true,
  template: {
    nameAr: 'قالب المطابخ', nameEn: 'Kitchens Template',
    versionNumber: 2, category: 'wood', pricingMethod: 'linear_meter',
    languagePrecedence: 'ar',
  },
  templateSnapshot: { sections: [], attachments: [] },
  lineItems: [
    { nameAr: 'خزائن علوية', pricingMethod: 'linear_meter', unitOfMeasure: 'm', boqGroupKey: 'upper_cabinets', quantity: 5,  unitPrice: 1200, totalCost: 6000 },
    { nameAr: 'خزائن سفلية', pricingMethod: 'linear_meter', unitOfMeasure: 'm', boqGroupKey: 'lower_cabinets', quantity: 5,  unitPrice: 1500, totalCost: 7500 },
    { nameAr: 'رخام',         pricingMethod: 'square_meter', unitOfMeasure: 'm²', boqGroupKey: 'countertop',     quantity: 8,  unitPrice: 850,  totalCost: 6800 },
    { nameAr: 'تركيب',         pricingMethod: 'lump_sum',     unitOfMeasure: '—',  boqGroupKey: 'install',        quantity: 1,  unitPrice: 20950, totalCost: 20950 },
  ],
};

const longArabic =
  'هذا بند طويل جداً يحتوي على شروط ومواصفات تفصيلية تشمل المواد المستخدمة وطرق التركيب والضمانات والصيانة والتسليم والاستلام والمسؤوليات المتبادلة بين الطرفين، ويمتد ليشمل عدة أسطر بهدف اختبار التغليف الصحيح للنص العربي في ملف PDF. ';

export const longArabicContractFixture: ContractExportData = {
  ...templatedContractFixture,
  contractNumber: 'CT-AR-0004',
  isRTL: true,
  executionAddressSnapshot: {
    label: 'موقع تركيب المطبخ',
    contact_name: 'أبو محمد',
    contact_phone: '+966500000000',
    city_name: 'جدة',
    district: 'السلامة',
    address_line1: 'شارع الأمير سلطان، مبنى 12',
    address_line2: 'الدور الأرضي',
    map_url: 'https://maps.google.com/?q=21.5433,39.1728',
    latitude: 21.5433,
    longitude: 39.1728,
    access_notes: 'الدخول من البوابة الجانبية بعد الساعة 9 صباحاً.',
    captured_at: '2026-02-01T08:00:00Z',
  },
  templateSnapshot: {
    sections: [
      {
        title_ar: 'بنود تفصيلية', sort_order: 1, is_required: true,
        clauses: [
          { body_ar: longArabic.repeat(3), sort_order: 1, is_mandatory: true },
          { body_ar: longArabic.repeat(2), sort_order: 2, is_mandatory: false },
        ],
      },
    ],
    attachments: templatedContractFixture.templateSnapshot?.attachments,
  },
};

export const contractWithAmendmentsFixture: ContractExportData = {
  ...templatedContractFixture,
  contractNumber: 'CT-AMD-0005',
  amendments: [
    {
      number: 1,
      createdAt: '2026-02-15',
      type: 'amount_change',
      status: 'applied',
      title: 'Increase scope',
      reason: 'Client requested additional windows.',
      oldTotal: 23000,
      newAmount: 26000,
      amountDelta: 3000,
      appliedAt: '2026-02-20',
    },
    {
      number: 2,
      createdAt: '2026-03-01',
      type: 'date_change',
      status: 'pending',
      title: 'Extend delivery',
      reason: 'Material lead time.',
      newEndDate: '2026-07-31',
    },
  ],
};

export const contractWithQrFixture: ContractExportData = {
  ...templatedContractFixture,
  contractNumber: 'CT-QR-0006',
  documentHash: 'abc123def456789012345678deadbeef',
  verifyOrigin: 'https://qitaat.com',
};

// Phase 7/8: contract that owns a unified barcode_code. The QR target must
// switch to /q/<code> and the identifiers section must render both codes.
export const contractWithBarcodeFixture: ContractExportData = {
  ...templatedContractFixture,
  contractNumber: 'CT-BC-0007',
  contractBarcodeCode: 'CNT-2026-100007',
  projectBarcodeCode: 'LOC-2026-100007',
  verifyOrigin: 'https://qitaat.com',
  isRTL: true,
};

export const ALL_FIXTURES: Record<string, ContractExportData> = {
  legacy: legacyContractFixture,
  templated: templatedContractFixture,
  kitchen: kitchenBoqFixture,
  longArabic: longArabicContractFixture,
  amendments: contractWithAmendmentsFixture,
  qr: contractWithQrFixture,
  barcode: contractWithBarcodeFixture,
};