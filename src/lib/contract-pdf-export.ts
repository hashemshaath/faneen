import { ArabicPdfFontError, setupArabicDoc, getArabicTableStyles, normalizeArabicPdfTextLayer, printContractSection, verifyArabicFontReady, verifyPdfBytesForMojibake } from './pdf-arabic-font';

// PDF-AR3: Single helper to extract bytes from a built jsPDF doc and run the
// auto-verification scan. Returning the bytes lets callers also upload the
// PDF to the backend analyzer without rebuilding it.
const extractDocBytes = (doc: unknown): Uint8Array =>
  new Uint8Array((doc as { output: (kind: 'arraybuffer') => ArrayBuffer }).output('arraybuffer'));

const runClientVerification = (doc: unknown) => {
  try { verifyPdfBytesForMojibake(extractDocBytes(doc)); } catch { /* non-fatal */ }
};
import { BRAND_DOCUMENTS } from '@/config/brandTheme';
import { hexToRgbTuple } from '@/lib/theme/brandThemeUtils';
import { calculateVatBreakdown, calculateContractCoverage } from '@/lib/contract-financials';
import { groupLineItemsByBoqGroup, hasMixedPricing, listPricingMethodsUsed } from './contract-boq';

// ── CT6: Pricing method labels (display only — no formula execution) ──
const PRICING_METHOD_LABEL: Record<string, { ar: string; en: string }> = {
  unit:         { ar: 'بالوحدة',          en: 'Per unit' },
  linear_meter: { ar: 'بالمتر الطولي',    en: 'Linear meter' },
  square_meter: { ar: 'بالمتر المربع',    en: 'Square meter' },
  cubic_meter:  { ar: 'بالمتر المكعب',    en: 'Cubic meter' },
  kilogram:     { ar: 'بالكيلوغرام',      en: 'Kilogram' },
  ton:          { ar: 'بالطن',             en: 'Ton' },
  lump_sum:     { ar: 'مبلغ مقطوع',       en: 'Lump sum' },
};
const UOM_FALLBACK: Record<string, string> = {
  unit: 'pcs', linear_meter: 'm', square_meter: 'm²', cubic_meter: 'm³',
  kilogram: 'kg', ton: 't', lump_sum: '—',
};
const labelForMethod = (m: string | null | undefined, isRTL: boolean): string => {
  const key = (m || 'unit') as keyof typeof PRICING_METHOD_LABEL;
  const x = PRICING_METHOD_LABEL[key] ?? PRICING_METHOD_LABEL.unit;
  return isRTL ? x.ar : x.en;
};
const summarizeFormulaInputs = (inputs: unknown, isRTL: boolean): string => {
  if (!inputs || typeof inputs !== 'object') return '-';
  const o = inputs as Record<string, unknown>;
  const parts: string[] = [];
  const num = (k: string): number | null => {
    const v = o[k];
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const L = num('length_mm'), W = num('width_mm'), H = num('height_mm');
  const wKg = num('weight_kg'), wT = num('weight_ton'), amt = num('amount');
  if (L != null && W != null && H != null) parts.push(`${L}×${W}×${H} mm`);
  else if (L != null && W != null)         parts.push(`${L}×${W} mm`);
  else if (L != null)                      parts.push(`${L} mm`);
  if (wKg != null) parts.push(`${wKg} kg`);
  if (wT  != null) parts.push(`${wT} t`);
  if (amt != null) parts.push(isRTL ? `مبلغ: ${amt}` : `amt: ${amt}`);
  return parts.length ? parts.join(' • ') : '-';
};

// ── Central brand document tokens (resolved once per module load) ──
// Falls back to the literal hex if the util ever returns null (it won't for
// these compile-time constants), so the PDF renderer always has a tuple.
const HEADER_RGB = hexToRgbTuple(BRAND_DOCUMENTS.pdfHeader)  ?? [19, 23, 34];
const ACCENT_RGB = hexToRgbTuple(BRAND_DOCUMENTS.pdfAccent)  ?? [14, 158, 111];
const TEXT_RGB   = hexToRgbTuple(BRAND_DOCUMENTS.invoiceText)   ?? [26, 34, 48];
const MUTED_RGB  = hexToRgbTuple(BRAND_DOCUMENTS.invoiceMuted)  ?? [107, 118, 137];
const BORDER_RGB = hexToRgbTuple(BRAND_DOCUMENTS.invoiceBorder) ?? [226, 230, 238];
// Soft tint for highlighted total rows — derived from primaryLight (#E6F7F0).
// Inlined as RGB because jsPDF doesn't accept hex strings for fillColor.
const HIGHLIGHT_RGB: [number, number, number] = [230, 247, 240];
const SURFACE2_RGB: [number, number, number] = [242, 244, 248];
const PDF_PAGE_MARGIN = 16;
const PDF_TABLE_MARGIN = { left: PDF_PAGE_MARGIN, right: PDF_PAGE_MARGIN };
const PDF_DENSE_TABLE_MARGIN = { left: 12, right: 12 };

type JsPdfWithAutoTable = { lastAutoTable?: { finalY?: number } };

const lastTableY = (doc: unknown, fallback: number): number =>
  (doc as JsPdfWithAutoTable).lastAutoTable?.finalY ?? fallback;

const ensureArabicPdfFont = (doc: { getFontList?: () => Record<string, string[]> }, isRTL: boolean) => {
  if (!isRTL) return;
  if (!verifyArabicFontReady(doc, isRTL)) {
    throw new ArabicPdfFontError('تعذر تضمين الخط العربي. قد لا يعمل البحث أو النسخ داخل ملف PDF بشكل صحيح.');
  }
};

const arabicFontStyle = (isRTL: boolean, fontLoaded: boolean) =>
  isRTL && fontLoaded ? { font: 'ArabicFont' } : {};

const tableHeadStyles = (isRTL: boolean, fontLoaded: boolean, fontSize = 7) => ({
  fillColor: HEADER_RGB,
  textColor: [255, 255, 255] as [number, number, number],
  fontStyle: 'bold' as const,
  fontSize,
  halign: isRTL ? 'right' as const : 'left' as const,
  ...arabicFontStyle(isRTL, fontLoaded),
});

const tableFootStyles = (isRTL: boolean, fontLoaded: boolean, fontSize = 7) => ({
  fillColor: HIGHLIGHT_RGB,
  fontStyle: 'bold' as const,
  fontSize,
  halign: isRTL ? 'right' as const : 'left' as const,
  ...arabicFontStyle(isRTL, fontLoaded),
});

export interface ContractExportData {
  contractNumber: string;
  title: string;
  description?: string;
  totalAmount: number;
  currency: string;
  startDate?: string;
  endDate?: string;
  clientName: string;
  providerName: string;
  supervisorName?: string;
  supervisorPhone?: string;
  supervisorEmail?: string;
  terms?: string;
  milestones: { id?: string; title: string; amount: number; dueDate?: string; status: string }[];
  payments?: {
    installmentNumber: number;
    title?: string;
    amount: number;
    dueDate?: string;
    status: string;
    milestoneTitle?: string;
    paidAt?: string;
  }[];
  measurements?: { pieceNumber: string; name: string; location: string; floor: string; lengthMm: number; widthMm: number; areaSqm: number; unitPrice: number; quantity: number; totalCost: number; status: string }[];
  /**
   * Attachment index entries — metadata only. Never include signed URLs,
   * storage paths, or `file_url` here. Visibility filtering happens in the
   * caller (RLS already gates the underlying query).
   */
  attachments?: {
    fileName: string;
    fileType?: string;
    fileSize?: number | null;
    linkedTo: string;
    description?: string | null;
    uploadedAt?: string | null;
  }[];
  vatRate?: number;
  vatInclusive?: boolean;
  businessName?: string;
  businessLogo?: string;
  /**
   * Amendments appendix — already filtered by RLS in the caller. No raw audit
   * metadata, no internal notes, no PII, no signed URLs.
   */
  amendments?: {
    number: number;          // display index (e.g. 1,2,3)
    createdAt?: string | null;
    type: string;            // amount_change | date_change | scope_change | ...
    status: string;          // pending | approved | rejected | cancelled | applied
    title: string;
    reason?: string | null;
    oldTotal?: number | null;
    newAmount?: number | null;
    amountDelta?: number | null;
    newEndDate?: string | null;
    clientApprovedAt?: string | null;
    providerApprovedAt?: string | null;
    appliedAt?: string | null;
  }[];
  /**
   * CT6: Optional template metadata block. Caller supplies safe display
   * fields only — never raw IDs, draft content, or admin notes.
   */
  template?: {
    nameAr?: string | null;
    nameEn?: string | null;
    versionNumber?: number | null;
    category?: string | null;
    pricingMethod?: string | null;
    languagePrecedence?: string | null;
  } | null;
  /**
   * CT6: Frozen template snapshot payload. Only `sections[].clauses[]` and
   * `attachments[]` (precedence_order, kind, title_ar/en, is_mandatory) are
   * read here. file_url and storage paths are NEVER rendered.
   */
  templateSnapshot?: {
    sections?: Array<{
      title_ar?: string;
      title_en?: string | null;
      sort_order?: number;
      is_required?: boolean;
      clauses?: Array<{
        body_ar?: string;
        body_en?: string | null;
        sort_order?: number;
        is_mandatory?: boolean;
      }>;
    }>;
    attachments?: Array<{
      kind?: string;
      title_ar?: string;
      title_en?: string | null;
      precedence_order?: number;
      is_mandatory?: boolean;
    }>;
  } | null;
  /**
   * CT6: Contract line items grouped by BOQ in PDF. Items must come from
   * `contract_line_items` (server-authoritative `total_cost`).
   */
  lineItems?: Array<{
    nameAr?: string | null;
    nameEn?: string | null;
    pricingMethod?: string | null;
    unitOfMeasure?: string | null;
    boqGroupKey?: string | null;
    quantity: number;
    unitPrice: number;
    totalCost: number;
    formulaInputs?: unknown;
  }>;
  isRTL: boolean;
  /**
   * C6.6: optional public verification hash (contract.document_hash). When
   * provided, a QR code + short verification block is rendered above the
   * signature panel. The QR encodes a public, no-PII verify URL backed by
   * the `verify_contract_public` RPC. When omitted (e.g., draft exports),
   * the verification block is skipped entirely.
   */
  documentHash?: string | null;
  /** Origin used for the verification URL (defaults to https://qitaat.com). */
  verifyOrigin?: string;
  /**
   * Barcode Phase 7: unified barcode codes. Caller resolves these via
   * `get_entity_barcode_code(entity_type, entity_id)`. Public-safe — never
   * include token hashes, raw QR tokens, or PII. Format: PREFIX-YYYY-NNNNNN.
   */
  contractBarcodeCode?: string | null;
  projectBarcodeCode?: string | null;
  /** Fallback display for project code when no client_site barcode exists. */
  siteRefFallback?: string | null;
  /**
   * Phase 5C.4 — Execution site (frozen address snapshot). Caller MUST pass
   * only the safe whitelisted fields below. Never include site_id, city_id,
   * created_by, archived_at, is_default, is_demo, client_user_id,
   * created_at, updated_at, storage paths, or signed URLs.
   */
  executionAddressSnapshot?: {
    label?: string | null;
    contact_name?: string | null;
    contact_phone?: string | null;
    city_name?: string | null;
    district?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    map_url?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    access_notes?: string | null;
    captured_at?: string | null;
  } | null;
}

/**
 * PDF-QA1: Pure builder. Constructs the contract PDF document and returns
 * the jsPDF instance WITHOUT triggering a browser download. Used by both
 * the user-facing `exportContractPDF` wrapper and automated test suites
 * (which inspect `doc.output('text')` for content + privacy assertions).
 * No user-visible behavior change.
 */
export const buildContractPDF = async (data: ContractExportData) => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const fontLoaded = await setupArabicDoc(doc, data.isRTL);
  ensureArabicPdfFont(doc, data.isRTL);
  const rtlStyles = getArabicTableStyles(data.isRTL, fontLoaded);

  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  let y = 16;

  const [accentR, accentG, accentB] = ACCENT_RGB;
  const [darkR,   darkG,   darkB]   = HEADER_RGB;
  const [textR,   textG,   textB]   = TEXT_RGB;
  const [mutedR,  mutedG,  mutedB]  = MUTED_RGB;
  const [borderR, borderG, borderB] = BORDER_RGB;

  // ── Header ──
  doc.setFillColor(darkR, darkG, darkB);
  doc.rect(0, 0, w, 40, 'F');
  doc.setFillColor(accentR, accentG, accentB);
  doc.rect(0, 40, w, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text(data.isRTL ? 'عقد رسمي' : 'Official Contract', w / 2, 16, { align: 'center' });
  doc.setFontSize(11);
  doc.setTextColor(accentR, accentG, accentB);
  doc.text(`#${data.contractNumber}`, w / 2, 24, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(borderR, borderG, borderB);
  doc.text(data.title.slice(0, 80), w / 2, 31, { align: 'center' });
  if (data.businessName) {
    doc.setFontSize(8);
    doc.text(data.businessName, w / 2, 37, { align: 'center' });
  }

  y = 50;
  doc.setTextColor(textR, textG, textB);

  const sectionTitle = (text: string) => {
    if (y > h - 30) { doc.addPage(); y = 15; }
    doc.setFillColor(accentR, accentG, accentB);
    if (data.isRTL) {
      doc.rect(w - 18, y - 3, 3, 8, 'F');
      doc.setFontSize(13);
      doc.setTextColor(darkR, darkG, darkB);
      doc.text(text, w - 22, y + 2, { align: 'right' });
    } else {
      doc.rect(15, y - 3, 3, 8, 'F');
      doc.setFontSize(13);
      doc.setTextColor(darkR, darkG, darkB);
      doc.text(text, 22, y + 2);
    }
    y += 10;
  };

  // ── Parties ──
  sectionTitle(data.isRTL ? 'أطراف العقد' : 'Contract Parties');
  const partiesData: string[][] = [
    [data.isRTL ? 'العميل' : 'Client', data.clientName],
    [data.isRTL ? 'مزود الخدمة' : 'Provider', data.providerName],
  ];
  if (data.supervisorName) partiesData.push([data.isRTL ? 'المشرف' : 'Supervisor', data.supervisorName]);
  if (data.supervisorPhone) partiesData.push([data.isRTL ? 'هاتف المشرف' : 'Supervisor Phone', data.supervisorPhone]);
  if (data.supervisorEmail) partiesData.push([data.isRTL ? 'بريد المشرف' : 'Supervisor Email', data.supervisorEmail]);

  autoTable(doc, {
    startY: y, body: partiesData, theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3.5, ...rtlStyles, lineColor: BORDER_RGB, lineWidth: 0.2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45, textColor: MUTED_RGB } },
    margin: PDF_TABLE_MARGIN,
    alternateRowStyles: { fillColor: SURFACE2_RGB },
  });
  y = lastTableY(doc, y) + 12;

  // ── Phase 5C.4: Execution Site (rendered from frozen snapshot only) ──
  {
    const snap = data.executionAddressSnapshot;
    if (snap) {
      sectionTitle(data.isRTL ? 'موقع التنفيذ' : 'Execution Site');
      const rows: string[][] = [];
      const push = (label: string, value: string | null | undefined) => {
        const v = (value ?? '').toString().trim();
        if (v) rows.push([label, v]);
      };
      const addrParts = [snap.address_line1, snap.address_line2].filter(Boolean).join(' — ');
      const cityDistrict = [snap.city_name, snap.district].filter(Boolean).join(' / ');
      push(data.isRTL ? 'اسم الموقع' : 'Site label', snap.label);
      push(data.isRTL ? 'العنوان' : 'Address', addrParts);
      push(data.isRTL ? 'المدينة / الحي' : 'City / District', cityDistrict);
      push(data.isRTL ? 'مسؤول الموقع' : 'Contact person', snap.contact_name);
      push(data.isRTL ? 'هاتف التواصل' : 'Contact phone', snap.contact_phone);
      push(data.isRTL ? 'رابط الخريطة' : 'Map link', snap.map_url);
      if (snap.latitude != null && snap.longitude != null) {
        push(
          data.isRTL ? 'الإحداثيات' : 'Coordinates',
          `${Number(snap.latitude).toFixed(5)}, ${Number(snap.longitude).toFixed(5)}`,
        );
      }
      push(data.isRTL ? 'ملاحظات الوصول' : 'Access notes', snap.access_notes);
      if (snap.captured_at) {
        const captured = new Date(snap.captured_at);
        if (!Number.isNaN(captured.getTime())) {
          push(
            data.isRTL ? 'تاريخ التثبيت' : 'Captured at',
            captured.toLocaleDateString(data.isRTL ? 'ar-SA-u-nu-latn' : 'en-US'),
          );
        }
      }
      if (rows.length > 0) {
        autoTable(doc, {
          startY: y, body: rows, theme: 'plain',
          styles: { fontSize: 9, cellPadding: 3.5, ...rtlStyles, lineColor: BORDER_RGB, lineWidth: 0.2 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55, textColor: MUTED_RGB } },
          margin: PDF_TABLE_MARGIN,
          alternateRowStyles: { fillColor: SURFACE2_RGB },
        });
        y = lastTableY(doc, y) + 12;
      }
    }
  }

  // ── CT6: Template metadata (compact) ──
  if (data.template) {
    const t = data.template;
    const tName = data.isRTL ? (t.nameAr || t.nameEn) : (t.nameEn || t.nameAr);
    if (tName || t.versionNumber || t.category || t.pricingMethod || t.languagePrecedence) {
      sectionTitle(data.isRTL ? 'قالب العقد' : 'Contract Template');
      const rows: string[][] = [];
      rows.push([data.isRTL ? 'القالب' : 'Template', tName || (data.isRTL ? 'عام / إرث' : 'General / Legacy')]);
      if (t.versionNumber) rows.push([data.isRTL ? 'الإصدار' : 'Version', `v${t.versionNumber}`]);
      if (t.category)      rows.push([data.isRTL ? 'الفئة' : 'Category', String(t.category)]);
      if (t.pricingMethod) rows.push([data.isRTL ? 'طريقة التسعير' : 'Pricing method', labelForMethod(t.pricingMethod, data.isRTL)]);
      if (t.languagePrecedence) rows.push([data.isRTL ? 'لغة الأسبقية' : 'Language precedence', t.languagePrecedence.toUpperCase()]);
      autoTable(doc, {
        startY: y, body: rows, theme: 'plain',
        styles: { fontSize: 9, cellPadding: 3.5, ...rtlStyles, lineColor: BORDER_RGB, lineWidth: 0.2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55, textColor: MUTED_RGB } },
        margin: PDF_TABLE_MARGIN,
        alternateRowStyles: { fillColor: SURFACE2_RGB },
      });
      y = lastTableY(doc, y) + 12;
    }
  } else {
    // Legacy contract — single-line note (no section header to avoid noise).
    sectionTitle(data.isRTL ? 'قالب العقد' : 'Contract Template');
    doc.setFontSize(8);
    doc.setTextColor(mutedR, mutedG, mutedB);
    const note = data.isRTL ? 'القالب: عام / إرث' : 'Template: General / Legacy';
    doc.text(note, data.isRTL ? w - 15 : 15, y, { align: data.isRTL ? 'right' : 'left' });
    y += 10;
  }

  // ── Financial ──
  sectionTitle(data.isRTL ? 'البيانات المالية' : 'Financial Summary');
  const _financial = calculateVatBreakdown({ amount: data.totalAmount, vatRate: data.vatRate ?? 15, vatInclusive: data.vatInclusive ?? false });
  const vatRate = _financial.vatRate;
  const vatInclusive = _financial.vatInclusive;
  const vatAmount = _financial.vatAmount;
  const subtotal = _financial.subtotal;
  const grandTotal = _financial.total;

  const fmtNum = (n: number) => n.toLocaleString(data.isRTL ? 'ar-SA-u-nu-latn' : 'en-US', { minimumFractionDigits: 2 });

  const finData: string[][] = [
    [data.isRTL ? 'المبلغ قبل الضريبة' : 'Subtotal (excl. VAT)', `${fmtNum(subtotal)} ${data.currency}`],
    [data.isRTL ? `ضريبة القيمة المضافة (${vatRate}%)` : `VAT (${vatRate}%)`, `${fmtNum(vatAmount)} ${data.currency}`],
    [data.isRTL ? 'الإجمالي شامل الضريبة' : 'Grand Total (incl. VAT)', `${fmtNum(grandTotal)} ${data.currency}`],
    [data.isRTL ? 'حالة الضريبة' : 'VAT Status', vatInclusive ? (data.isRTL ? 'الأسعار شاملة الضريبة' : 'Prices include VAT') : (data.isRTL ? 'الضريبة تضاف على المجموع' : 'VAT added to total')],
    [data.isRTL ? 'تاريخ البداية' : 'Start Date', data.startDate || '-'],
    [data.isRTL ? 'تاريخ النهاية' : 'End Date', data.endDate || '-'],
  ];

  autoTable(doc, {
    startY: y, body: finData, theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3.5, ...rtlStyles, lineColor: BORDER_RGB, lineWidth: 0.2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55, textColor: MUTED_RGB } },
    margin: PDF_TABLE_MARGIN,
    didParseCell: (hookData: any) => {
      if (hookData.row.index === 2) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = HIGHLIGHT_RGB;
      }
    },
  });
  y = lastTableY(doc, y) + 12;

  // ── Milestones ──
  if (data.milestones.length > 0) {
    sectionTitle(data.isRTL ? 'مراحل التنفيذ' : 'Milestones');
    autoTable(doc, {
      startY: y,
      head: [['#', data.isRTL ? 'المرحلة' : 'Milestone', data.isRTL ? 'المبلغ' : 'Amount', data.isRTL ? 'التاريخ' : 'Due Date', data.isRTL ? 'الحالة' : 'Status']],
      body: data.milestones.map((m, i) => [
        String(i + 1), m.title,
        `${m.amount.toLocaleString(data.isRTL ? 'ar-SA-u-nu-latn' : 'en-US')} ${data.currency}`,
        m.dueDate || '-', m.status,
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3, ...rtlStyles },
      headStyles: tableHeadStyles(data.isRTL, fontLoaded),
      alternateRowStyles: { fillColor: SURFACE2_RGB },
      margin: PDF_TABLE_MARGIN,
    });
    y = lastTableY(doc, y) + 12;
    // If milestones carry no financial values, add a neutral note.
    const milestonesHaveAmounts = data.milestones.some((m) => Number(m.amount) > 0);
    if (!milestonesHaveAmounts) {
      doc.setFontSize(8);
      doc.setTextColor(mutedR, mutedG, mutedB);
      const note = data.isRTL
        ? 'المراحل تنظيمية وقد لا تكون مرتبطة بقيم مالية مباشرة.'
        : 'Milestones are organisational and may not carry direct financial values.';
      doc.text(note, data.isRTL ? w - 15 : 15, y, { align: data.isRTL ? 'right' : 'left' });
      y += 8;
    }
  }

  // ── Payment Schedule ──
  if (data.payments && data.payments.length > 0) {
    sectionTitle(data.isRTL ? 'جدول الدفعات' : 'Payment Schedule');
    const totalForPct = data.totalAmount > 0 ? data.totalAmount : 0;
    autoTable(doc, {
      startY: y,
      head: [[
        '#',
        data.isRTL ? 'عنوان الدفعة' : 'Title',
        data.isRTL ? 'النسبة' : '%',
        data.isRTL ? 'المبلغ' : 'Amount',
        data.isRTL ? 'تاريخ الاستحقاق' : 'Due Date',
        data.isRTL ? 'الحالة' : 'Status',
        data.isRTL ? 'المرحلة المرتبطة' : 'Linked Milestone',
        data.isRTL ? 'تاريخ الدفع' : 'Paid At',
      ]],
      body: data.payments.map((p) => {
        const pct = totalForPct > 0 ? `${((Number(p.amount) / totalForPct) * 100).toFixed(1)}%` : '-';
        return [
          String(p.installmentNumber),
          p.title || (data.isRTL ? `الدفعة #${p.installmentNumber}` : `Payment #${p.installmentNumber}`),
          pct,
          `${fmtNum(Number(p.amount))} ${data.currency}`,
          p.dueDate || '-',
          p.status,
          p.milestoneTitle || '-',
          p.paidAt || '-',
        ];
      }),
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2.5, ...rtlStyles },
      headStyles: tableHeadStyles(data.isRTL, fontLoaded, 7.5),
      alternateRowStyles: { fillColor: SURFACE2_RGB },
      margin: PDF_DENSE_TABLE_MARGIN,
    });
    y = lastTableY(doc, y) + 10;

    // Paid / Remaining + Coverage summary using shared helper (single source of truth).
    const coverage = calculateContractCoverage({
      contract: {
        total_amount: data.totalAmount,
        vat_rate: data.vatRate,
        vat_inclusive: data.vatInclusive,
        currency_code: data.currency,
      },
      payments: data.payments.map((p) => ({
        amount: Number(p.amount),
        status: p.status,
        milestone_id: p.milestoneTitle ? 'linked' : null,
      })),
      milestones: data.milestones.map((m) => ({ id: m.id, amount: Number(m.amount) })),
    });

    const coverageLabel = (state: string): string => {
      if (data.isRTL) {
        if (state === 'matched') return 'مطابقة';
        if (state === 'over') return 'تجاوز قيمة العقد';
        if (state === 'under') return 'أقل من قيمة العقد';
        return 'لا يوجد جدول';
      }
      if (state === 'matched') return 'Matched';
      if (state === 'over') return 'Exceeds contract total';
      if (state === 'under') return 'Below contract total';
      return 'No schedule';
    };

    const summaryRows: string[][] = [
      [data.isRTL ? 'إجمالي الدفعات المجدولة' : 'Scheduled total', `${fmtNum(coverage.paymentsTotal)} ${data.currency}`],
      [data.isRTL ? 'المدفوع' : 'Paid', `${fmtNum(coverage.paidAmount)} ${data.currency} (${coverage.paidCount}/${coverage.paymentsCount})`],
      [data.isRTL ? 'المعلّق' : 'Pending', `${fmtNum(coverage.pendingAmount)} ${data.currency}`],
      [data.isRTL ? 'المتبقي على العقد' : 'Remaining on contract', `${fmtNum(coverage.remainingBalance)} ${data.currency}`],
      [data.isRTL ? 'تغطية الدفعات' : 'Payments coverage', coverageLabel(coverage.paymentsState)],
    ];
    autoTable(doc, {
      startY: y, body: summaryRows, theme: 'plain',
      styles: { fontSize: 9, cellPadding: 3.5, ...rtlStyles, lineColor: BORDER_RGB, lineWidth: 0.2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 65, textColor: MUTED_RGB } },
      margin: PDF_TABLE_MARGIN,
      didParseCell: (hookData: any) => {
        if (hookData.row.index === 3) {
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = HIGHLIGHT_RGB;
        }
      },
    });
    y = lastTableY(doc, y) + 12;
  }

  // ── Measurements ──
  if (data.measurements && data.measurements.length > 0) {
    sectionTitle(data.isRTL ? 'جدول المقاسات' : 'Measurements Schedule');
    const totalArea = data.measurements.reduce((s, m) => s + m.areaSqm, 0);
    const totalCost = data.measurements.reduce((s, m) => s + m.totalCost, 0);
    const _mv = calculateVatBreakdown({ amount: totalCost, vatRate, vatInclusive });
    const mVat = _mv.vatAmount;
    const mGrand = _mv.total;

    autoTable(doc, {
      startY: y,
      head: [['#', data.isRTL ? 'القطعة' : 'Piece', data.isRTL ? 'الموقع' : 'Location', data.isRTL ? 'الدور' : 'Floor', data.isRTL ? 'الأبعاد (مم)' : 'Dims (mm)', data.isRTL ? 'المساحة م²' : 'Area m²', data.isRTL ? 'سعر/وحدة' : 'Unit $', data.isRTL ? 'الكمية' : 'Qty', data.isRTL ? 'التكلفة' : 'Cost']],
      body: data.measurements.map(m => [
        m.pieceNumber, m.name, m.location || '-', m.floor || '-',
        `${m.lengthMm}×${m.widthMm}`, m.areaSqm.toFixed(3),
        m.unitPrice.toLocaleString(data.isRTL ? 'ar-SA-u-nu-latn' : 'en-US'),
        String(m.quantity), m.totalCost.toLocaleString(data.isRTL ? 'ar-SA-u-nu-latn' : 'en-US'),
      ]),
      foot: [
        ['', data.isRTL ? 'المجموع' : 'Subtotal', '', '', '', totalArea.toFixed(3), '', String(data.measurements.length), totalCost.toLocaleString(data.isRTL ? 'ar-SA-u-nu-latn' : 'en-US')],
        ['', data.isRTL ? `ضريبة ${vatRate}%` : `VAT ${vatRate}%`, '', '', '', '', '', '', mVat.toLocaleString(data.isRTL ? 'ar-SA-u-nu-latn' : 'en-US', { maximumFractionDigits: 2 })],
        ['', data.isRTL ? 'الإجمالي شامل الضريبة' : 'Grand Total', '', '', '', '', '', '', mGrand.toLocaleString(data.isRTL ? 'ar-SA-u-nu-latn' : 'en-US', { maximumFractionDigits: 2 })],
      ],
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2.5, ...rtlStyles },
      headStyles: tableHeadStyles(data.isRTL, fontLoaded, 7),
      alternateRowStyles: { fillColor: SURFACE2_RGB },
      footStyles: tableFootStyles(data.isRTL, fontLoaded, 7),
      margin: PDF_DENSE_TABLE_MARGIN,
    });
    y = lastTableY(doc, y) + 12;
  }

  // ── CT6: BOQ Line Items grouped by boq_group_key ──
  if (data.lineItems && data.lineItems.length > 0) {
    sectionTitle(data.isRTL ? 'بنود الأعمال (BOQ)' : 'Line Items (BOQ)');

    const itemsForGrouping = data.lineItems.map((li, idx) => ({
      id: String(idx),
      boq_group_key: li.boqGroupKey ?? null,
      pricing_method: li.pricingMethod ?? 'unit',
      total_cost: li.totalCost,
      _src: li,
    }));
    const groups = groupLineItemsByBoqGroup(itemsForGrouping);
    const grandTotal = data.lineItems.reduce((s, li) => s + Number(li.totalCost || 0), 0);

    // Mixed-pricing badge line
    if (hasMixedPricing(itemsForGrouping)) {
      const used = listPricingMethodsUsed(itemsForGrouping)
        .map((m) => labelForMethod(m, data.isRTL))
        .join(' / ');
      doc.setFontSize(8);
      doc.setTextColor(mutedR, mutedG, mutedB);
      const txt = (data.isRTL ? 'تسعير مختلط: ' : 'Mixed pricing: ') + used;
      doc.text(txt, data.isRTL ? w - 15 : 15, y, { align: data.isRTL ? 'right' : 'left' });
      y += 6;
    }

    for (const g of groups) {
      if (y > h - 40) { doc.addPage(); y = 15; }
      // Group title bar
      doc.setFillColor(...SURFACE2_RGB);
      doc.rect(15, y - 2, w - 30, 7, 'F');
      doc.setFontSize(9);
      doc.setTextColor(darkR, darkG, darkB);
      doc.text(
        data.isRTL ? g.label_ar : g.label_en,
        data.isRTL ? w - 18 : 18,
        y + 3,
        { align: data.isRTL ? 'right' : 'left' },
      );
      y += 7;

      autoTable(doc, {
        startY: y,
        head: [[
          '#',
          data.isRTL ? 'البند' : 'Item',
          data.isRTL ? 'طريقة التسعير' : 'Method',
          data.isRTL ? 'الوحدة' : 'Unit',
          data.isRTL ? 'الأبعاد/الوزن' : 'Dims/Weight',
          data.isRTL ? 'الكمية' : 'Qty',
          data.isRTL ? 'سعر/وحدة' : 'Unit price',
          data.isRTL ? 'الإجمالي' : 'Total',
        ]],
        body: g.items.map((row, i) => {
          const li = row._src;
          const name = data.isRTL ? (li.nameAr || li.nameEn || '-') : (li.nameEn || li.nameAr || '-');
          const method = li.pricingMethod || 'unit';
          const uom = li.unitOfMeasure || UOM_FALLBACK[method] || '-';
          return [
            String(i + 1),
            String(name).slice(0, 60),
            labelForMethod(method, data.isRTL),
            uom,
            summarizeFormulaInputs(li.formulaInputs, data.isRTL),
            String(li.quantity),
            fmtNum(Number(li.unitPrice)),
            fmtNum(Number(li.totalCost)),
          ];
        }),
        foot: [[
          '', data.isRTL ? 'مجموع المجموعة' : 'Group subtotal',
          '', '', '', '', '', `${fmtNum(g.subtotal)} ${data.currency}`,
        ]],
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2.2, ...rtlStyles },
        headStyles: tableHeadStyles(data.isRTL, fontLoaded, 7),
        alternateRowStyles: { fillColor: SURFACE2_RGB },
        footStyles: tableFootStyles(data.isRTL, fontLoaded, 7),
        margin: PDF_DENSE_TABLE_MARGIN,
      });
      y = lastTableY(doc, y) + 6;
    }

    // Grand total
    if (y > h - 18) { doc.addPage(); y = 15; }
    doc.setFillColor(...HIGHLIGHT_RGB);
    doc.rect(15, y, w - 30, 9, 'F');
    doc.setFontSize(10);
    doc.setTextColor(darkR, darkG, darkB);
    const gtLabel = data.isRTL ? 'الإجمالي العام للبنود' : 'BOQ Grand Total';
    const gtValue = `${fmtNum(grandTotal)} ${data.currency}`;
    doc.text(gtLabel, data.isRTL ? w - 18 : 18, y + 6, { align: data.isRTL ? 'right' : 'left' });
    doc.text(gtValue, data.isRTL ? 18 : w - 18, y + 6, { align: data.isRTL ? 'left' : 'right' });
    y += 14;
  }

  // ── Terms ──
  if (data.terms) {
    sectionTitle(data.isRTL ? 'الشروط والالتزامات' : 'Terms & Conditions');
    doc.setFontSize(8);
    doc.setTextColor(mutedR, mutedG, mutedB);
    const lines = doc.splitTextToSize(data.terms, w - 30);
    if (y + lines.length * 4 > h - 20) { doc.addPage(); y = 15; }
    doc.text(lines, data.isRTL ? w - 15 : 15, y, { align: data.isRTL ? 'right' : 'left' });
    y += lines.length * 4 + 12;
  }

  // ── CT6: Template clauses from frozen snapshot (published only) ──
  const snapSections = data.templateSnapshot?.sections;
  if (snapSections && snapSections.length > 0) {
    sectionTitle(data.isRTL ? 'بنود القالب' : 'Template Clauses');
    const ordered = [...snapSections].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
    for (const s of ordered) {
      const sTitle = data.isRTL ? (s.title_ar || s.title_en) : (s.title_en || s.title_ar);
      if (!sTitle) continue;
      if (y > h - 25) { doc.addPage(); y = 15; }
      doc.setFontSize(10);
      doc.setTextColor(darkR, darkG, darkB);
      doc.text(String(sTitle), data.isRTL ? w - 15 : 15, y, { align: data.isRTL ? 'right' : 'left' });
      y += 5;
      const clauses = [...(s.clauses || [])].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
      );
      for (let i = 0; i < clauses.length; i++) {
        const c = clauses[i];
        const body = data.isRTL ? (c.body_ar || c.body_en) : (c.body_en || c.body_ar);
        if (!body) continue;
        const mandatory = c.is_mandatory
          ? (data.isRTL ? '★ ' : '★ ')
          : '';
        const prefix = `${mandatory}${i + 1}. `;
        doc.setFontSize(8);
        doc.setTextColor(textR, textG, textB);
        const wrapped = doc.splitTextToSize(`${prefix}${String(body)}`, w - 34);
        if (y + wrapped.length * 4 > h - 20) { doc.addPage(); y = 15; }
        doc.text(wrapped, data.isRTL ? w - 17 : 17, y, { align: data.isRTL ? 'right' : 'left' });
        y += wrapped.length * 4 + 1;
      }
      y += 4;
    }
    // Mandatory legend
    doc.setFontSize(7);
    doc.setTextColor(mutedR, mutedG, mutedB);
    const legend = data.isRTL ? '★ بند إلزامي' : '★ Mandatory clause';
    if (y + 4 > h - 20) { doc.addPage(); y = 15; }
    doc.text(legend, data.isRTL ? w - 15 : 15, y, { align: data.isRTL ? 'right' : 'left' });
    y += 10;
  }

  // ── CT6: Document precedence (no URLs, no storage paths) ──
  {
    const snapAtt = data.templateSnapshot?.attachments;
    let order: string[] = [];
    if (snapAtt && snapAtt.length > 0) {
      order = [...snapAtt]
        .sort((a, b) => (a.precedence_order ?? 0) - (b.precedence_order ?? 0))
        .map((a, idx) => {
          const t = data.isRTL ? (a.title_ar || a.title_en) : (a.title_en || a.title_ar);
          const mark = a.is_mandatory ? (data.isRTL ? ' (إلزامي)' : ' (mandatory)') : '';
          return `${idx + 1}. ${t || a.kind || '-'}${mark}`;
        });
    } else {
      order = data.isRTL
        ? [
            '1. آخر ملحق معتمد',
            '2. عرض السعر / جدول الكميات المعتمد',
            '3. المقاسات وبنود العمل',
            '4. المخططات والمواصفات',
            '5. شروط خاصة',
            '6. شروط عامة',
          ]
        : [
            '1. Latest approved amendment',
            '2. Approved quote / BOQ',
            '3. Measurements and line items',
            '4. Drawings and specifications',
            '5. Special terms',
            '6. General terms',
          ];
    }
    if (order.length > 0) {
      sectionTitle(data.isRTL ? 'أولوية المستندات' : 'Document Precedence');
      doc.setFontSize(8);
      doc.setTextColor(textR, textG, textB);
      for (const line of order) {
        if (y + 5 > h - 20) { doc.addPage(); y = 15; }
        doc.text(line, data.isRTL ? w - 17 : 17, y, { align: data.isRTL ? 'right' : 'left' });
        y += 5;
      }
      y += 6;
    }
  }

  // ── Attachments Index (metadata only — no URLs/paths) ──
  if (data.attachments) {
    sectionTitle(data.isRTL ? 'فهرس المرفقات' : 'Attachments Index');
    if (data.attachments.length === 0) {
      doc.setFontSize(8);
      doc.setTextColor(mutedR, mutedG, mutedB);
      const msg = data.isRTL ? 'لا توجد مرفقات مسجلة لهذا العقد.' : 'No attachments recorded for this contract.';
      if (y + 8 > h - 20) { doc.addPage(); y = 15; }
      doc.text(msg, data.isRTL ? w - 15 : 15, y, { align: data.isRTL ? 'right' : 'left' });
      y += 12;
    } else {
      const fmtSize = (b?: number | null): string => {
        if (b == null || !Number.isFinite(b) || b <= 0) return '-';
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0; let n = b;
        while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
        return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
      };
      const shortType = (t?: string): string => {
        if (!t) return '-';
        const slash = t.indexOf('/');
        return (slash === -1 ? t : t.slice(slash + 1)).toUpperCase().slice(0, 12);
      };
      autoTable(doc, {
        startY: y,
        head: [[
          '#',
          data.isRTL ? 'اسم الملف' : 'File name',
          data.isRTL ? 'النوع' : 'Type',
          data.isRTL ? 'الحجم' : 'Size',
          data.isRTL ? 'مرتبط بـ' : 'Linked to',
          data.isRTL ? 'الوصف' : 'Description',
          data.isRTL ? 'تاريخ الرفع' : 'Uploaded',
        ]],
        body: data.attachments.map((a, idx) => [
          String(idx + 1),
          (a.fileName || '-').slice(0, 60),
          shortType(a.fileType),
          fmtSize(a.fileSize),
          (a.linkedTo || (data.isRTL ? 'عام' : 'General')).slice(0, 60),
          (a.description || '-').slice(0, 80),
          a.uploadedAt
            ? new Date(a.uploadedAt).toLocaleDateString(data.isRTL ? 'ar-SA-u-nu-latn' : 'en-US')
            : '-',
        ]),
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2.2, ...rtlStyles },
        headStyles: tableHeadStyles(data.isRTL, fontLoaded, 7),
        alternateRowStyles: { fillColor: SURFACE2_RGB },
        margin: PDF_DENSE_TABLE_MARGIN,
      });
      y = lastTableY(doc, y) + 12;
    }
  }

  // ── Amendments Appendix (metadata only — no audit, no PII, no URLs) ──
  if (data.amendments && data.amendments.length > 0) {
    sectionTitle(data.isRTL ? 'ملحقات وتعديلات العقد' : 'Contract Amendments');

    const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
      pending:   { ar: 'قيد المراجعة', en: 'Pending' },
      approved:  { ar: 'معتمد',         en: 'Approved' },
      rejected:  { ar: 'مرفوض',         en: 'Rejected' },
      cancelled: { ar: 'ملغي',          en: 'Cancelled' },
      applied:   { ar: 'مطبق',          en: 'Applied' },
    };
    const TYPE_LABEL: Record<string, { ar: string; en: string }> = {
      scope_change:       { ar: 'نطاق العمل',     en: 'Scope' },
      amount_change:      { ar: 'قيمة العقد',      en: 'Amount' },
      date_change:        { ar: 'تاريخ الانتهاء',  en: 'End date' },
      measurement_change: { ar: 'المقاسات',        en: 'Measurements' },
      financial:          { ar: 'مالي',             en: 'Financial' },
      extension:          { ar: 'تمديد',            en: 'Extension' },
      other:              { ar: 'أخرى',             en: 'Other' },
    };
    const fmtDate = (d?: string | null): string =>
      d ? new Date(d).toLocaleDateString(data.isRTL ? 'ar-SA-u-nu-latn' : 'en-US') : '-';
    const fmtMoney = (n?: number | null): string =>
      n == null || !Number.isFinite(n) ? '-' : `${fmtNum(Number(n))} ${data.currency}`;
    const fmtDelta = (n?: number | null): string => {
      if (n == null || !Number.isFinite(n)) return '-';
      const v = Number(n);
      const sign = v > 0 ? '+' : '';
      return `${sign}${fmtNum(v)} ${data.currency}`;
    };

    autoTable(doc, {
      startY: y,
      head: [[
        '#',
        data.isRTL ? 'التاريخ' : 'Date',
        data.isRTL ? 'النوع' : 'Type',
        data.isRTL ? 'الحالة' : 'Status',
        data.isRTL ? 'العنوان' : 'Title',
        data.isRTL ? 'القيمة السابقة' : 'Old total',
        data.isRTL ? 'القيمة الجديدة' : 'New amount',
        data.isRTL ? 'الفرق' : 'Delta',
        data.isRTL ? 'تاريخ النهاية الجديد' : 'New end',
        data.isRTL ? 'موافقة العميل' : 'Client appr.',
        data.isRTL ? 'موافقة المزود' : 'Provider appr.',
        data.isRTL ? 'تاريخ التطبيق' : 'Applied',
      ]],
      body: data.amendments.map(a => {
        const t = TYPE_LABEL[a.type] ?? { ar: a.type, en: a.type };
        const s = STATUS_LABEL[a.status] ?? { ar: a.status, en: a.status };
        return [
          String(a.number),
          fmtDate(a.createdAt),
          data.isRTL ? t.ar : t.en,
          data.isRTL ? s.ar : s.en,
          (a.title || '-').slice(0, 60),
          fmtMoney(a.oldTotal),
          fmtMoney(a.newAmount),
          fmtDelta(a.amountDelta),
          a.newEndDate || '-',
          fmtDate(a.clientApprovedAt),
          fmtDate(a.providerApprovedAt),
          fmtDate(a.appliedAt),
        ];
      }),
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2.2, ...rtlStyles },
      headStyles: tableHeadStyles(data.isRTL, fontLoaded, 7),
      alternateRowStyles: { fillColor: SURFACE2_RGB },
      margin: PDF_DENSE_TABLE_MARGIN,
      didParseCell: (hookData: any) => {
        if (hookData.section !== 'body') return;
        const a = data.amendments![hookData.row.index];
        if (!a) return;
        // Emphasize approved/applied in the Status column.
        if (hookData.column.index === 3 && (a.status === 'approved' || a.status === 'applied')) {
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = HIGHLIGHT_RGB;
        }
      },
    });
    y = lastTableY(doc, y) + 8;

    // Compact reasons list for amendments that carry a reason — kept short.
    const withReason = data.amendments.filter(a => a.reason && a.reason.trim().length > 0);
    if (withReason.length > 0) {
      doc.setFontSize(7.5);
      doc.setTextColor(mutedR, mutedG, mutedB);
      const label = data.isRTL ? 'الأسباب المسجلة:' : 'Recorded reasons:';
      if (y + 6 > h - 20) { doc.addPage(); y = 15; }
      doc.text(label, data.isRTL ? w - 15 : 15, y, { align: data.isRTL ? 'right' : 'left' });
      y += 4.5;
      for (const a of withReason) {
        const line = `#${a.number} — ${(a.reason || '').slice(0, 160)}`;
        const wrapped = doc.splitTextToSize(line, w - 30);
        if (y + wrapped.length * 4 > h - 20) { doc.addPage(); y = 15; }
        doc.text(wrapped, data.isRTL ? w - 15 : 15, y, { align: data.isRTL ? 'right' : 'left' });
        y += wrapped.length * 4;
      }
      y += 8;
    } else {
      y += 4;
    }
  }

  // ── Signatures ──
  if (y > h - 45) { doc.addPage(); y = 15; }
  y += 5;

  // ── C6.6: Public Verification Block (QR + short hash) ──
  // Public-safe: encodes only contract_number + document_hash. The RPC behind
  // the URL returns no PII, no totals, no party names — only status, dates,
  // currency, hash prefix, and applied amendment count.
  if (data.documentHash && data.documentHash.length >= 8) {
    try {
      const origin = (data.verifyOrigin || 'https://qitaat.com').replace(/\/+$/, '');
      const verifyUrl = `${origin}/v/c/${encodeURIComponent(data.contractNumber)}?h=${encodeURIComponent(data.documentHash)}`;
      const QR = await import('qrcode');
      const qrDataUrl = await QR.toDataURL(verifyUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 256,
        color: { dark: '#131722', light: '#FFFFFF' },
      });
      if (y > h - 75) { doc.addPage(); y = 15; }
      const blockH = 28;
      doc.setFillColor(...SURFACE2_RGB);
      doc.rect(15, y, w - 30, blockH, 'F');
      doc.setDrawColor(borderR, borderG, borderB);
      doc.setLineWidth(0.2);
      doc.rect(15, y, w - 30, blockH, 'S');
      // QR on the leading edge (RTL: right side)
      const qrSize = 24;
      const qrX = data.isRTL ? w - 15 - qrSize - 2 : 17;
      doc.addImage(qrDataUrl, 'PNG', qrX, y + 2, qrSize, qrSize);
      // Text on the opposite side
      const textX = data.isRTL ? 17 : 15 + qrSize + 6;
      const textAlign: 'left' | 'right' = data.isRTL ? 'right' : 'left';
      const textAnchor = data.isRTL ? w - 15 - qrSize - 6 : textX;
      doc.setTextColor(textR, textG, textB);
      doc.setFontSize(9);
      doc.text(data.isRTL ? 'تحقق من العقد الرسمي' : 'Verify Official Contract', textAnchor, y + 6, { align: textAlign });
      doc.setFontSize(7);
      doc.setTextColor(mutedR, mutedG, mutedB);
      const hashLine = (data.isRTL ? 'بصمة المستند: ' : 'Document hash: ') + data.documentHash.slice(0, 16) + '…';
      doc.text(hashLine, textAnchor, y + 12, { align: textAlign });
      const urlShort = verifyUrl.length > 60 ? verifyUrl.slice(0, 57) + '…' : verifyUrl;
      doc.text(urlShort, textAnchor, y + 18, { align: textAlign });
      doc.text(
        data.isRTL ? 'امسح الرمز للتحقق العام بدون بيانات شخصية' : 'Scan the code for public, PII-free verification',
        textAnchor, y + 24, { align: textAlign },
      );
      y += blockH + 5;
    } catch {
      // QR rendering must never block PDF export. Skip silently on failure.
    }
  }

  if (y > h - 45) { doc.addPage(); y = 15; }
  doc.setFillColor(...SURFACE2_RGB);
  doc.rect(15, y, w - 30, 35, 'F');
  doc.setDrawColor(accentR, accentG, accentB);
  doc.setLineWidth(0.5);
  doc.line(25, y + 25, 85, y + 25);
  doc.line(w - 85, y + 25, w - 25, y + 25);
  doc.setFontSize(8);
  doc.setTextColor(mutedR, mutedG, mutedB);
  doc.text(data.isRTL ? 'توقيع المزود' : 'Client Signature', 55, y + 30, { align: 'center' });
  doc.text(data.isRTL ? 'توقيع العميل' : 'Provider Signature', w - 55, y + 30, { align: 'center' });

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(accentR, accentG, accentB);
    doc.rect(0, h - 10, w, 0.5, 'F');
    doc.setFontSize(7);
    doc.setTextColor(mutedR, mutedG, mutedB);
    doc.text(`${data.isRTL ? 'صفحة' : 'Page'} ${i}/${pageCount}`, w / 2, h - 5, { align: 'center' });
    doc.text(data.contractNumber, 15, h - 5);
    doc.text(new Date().toLocaleDateString(data.isRTL ? 'ar-SA-u-nu-latn' : 'en-US'), w - 15, h - 5, { align: 'right' });
  }

  if (fontLoaded) normalizeArabicPdfTextLayer(doc);

  return doc;
};

/**
 * PDF-QA1: User-facing export wrapper. Builds the document and triggers the
 * browser download. Kept as the public API so existing callers are unchanged.
 */
export const exportContractPDF = async (data: ContractExportData) => {
  const doc = await buildContractPDF(data);
  runClientVerification(doc);
  doc.save(`contract-${data.contractNumber}.pdf`);
  return doc;
};

/**
 * PDF-UX1: Build the contract PDF and return a Blob + Object URL suitable for
 * inline `<iframe>` preview. The caller is responsible for revoking the URL
 * via `URL.revokeObjectURL(url)` when the preview is dismissed.
 *
 * No file is uploaded, persisted, or logged here — preview is a pure
 * client-side render and is intentionally NOT recorded in the export history
 * (only confirmed downloads are logged).
 */
export const previewContractPDF = async (
  data: ContractExportData,
): Promise<{ url: string; blob: Blob; fileName: string }> => {
  const doc = await buildContractPDF(data);
  runClientVerification(doc);
  const blob = (doc as unknown as { output: (kind: 'blob') => Blob }).output('blob');
  const url = URL.createObjectURL(blob);
  return { url, blob, fileName: `contract-${data.contractNumber}.pdf` };
};

export const buildArabicFontTestPDF = async () => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const fontLoaded = await setupArabicDoc(doc, true);
  ensureArabicPdfFont(doc, true);
  const rtlStyles = getArabicTableStyles(true, fontLoaded);
  const w = doc.internal.pageSize.getWidth();
  let y = 18;

  doc.setTextColor(...TEXT_RGB);
  doc.setFontSize(18);
  doc.text('اختبار الخط العربي في PDF', w / 2, y, { align: 'center' });
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(...MUTED_RGB);
  doc.text('ملف آمن للتشخيص فقط — ليس جزءاً من محتوى العقد القانوني.', w / 2, y, { align: 'center' });
  y += 12;

  doc.setTextColor(...TEXT_RGB);
  doc.setFontSize(11);
  const paragraph = 'هذا نص عربي لاختبار وضوح القراءة والهوامش واتجاه الكتابة. يتضمن العقد والضريبة والضمان والشروط وأرقاماً مثل 1000×2000 mm ومبلغ 12,500 SAR.';
  const paragraphLines = doc.splitTextToSize(paragraph, w - 34);
  doc.text(paragraphLines, w - PDF_PAGE_MARGIN, y, { align: 'right' });
  y += paragraphLines.length * 5 + 8;

  doc.setFontSize(10);
  doc.setTextColor(...MUTED_RGB);
  doc.text('نص قرآني لاختبار عرض الخط العربي فقط', w - PDF_PAGE_MARGIN, y, { align: 'right' });
  y += 7;
  doc.setFontSize(14);
  doc.setTextColor(...TEXT_RGB);
  for (const line of ['بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', 'قُلْ هُوَ اللَّهُ أَحَدٌ', 'اللَّهُ الصَّمَدُ']) {
    doc.text(line, w - PDF_PAGE_MARGIN, y, { align: 'right' });
    y += 8;
  }

  y += 4;
  autoTable(doc, {
    startY: y,
    head: [['#', 'البند', 'الكمية', 'السعر', 'الإجمالي']],
    body: [
      ['1', 'اختبار العقد', '2', '1,000 SAR', '2,000 SAR'],
      ['2', 'اختبار الضريبة والضمان', '1', '500 SAR', '500 SAR'],
      ['3', 'اختبار الشروط والأبعاد 1000×2000 mm', '1', '250 SAR', '250 SAR'],
    ],
    foot: [['', 'الإجمالي شامل الضريبة', '', '', '2,750 SAR']],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, ...rtlStyles },
    headStyles: tableHeadStyles(true, fontLoaded, 9),
    footStyles: tableFootStyles(true, fontLoaded, 9),
    alternateRowStyles: { fillColor: SURFACE2_RGB },
    margin: PDF_TABLE_MARGIN,
  });
  y = lastTableY(doc, y) + 14;

  doc.setFillColor(...SURFACE2_RGB);
  doc.rect(PDF_PAGE_MARGIN, y, w - PDF_PAGE_MARGIN * 2, 30, 'F');
  doc.setDrawColor(...ACCENT_RGB);
  doc.line(w - 85, y + 20, w - 25, y + 20);
  doc.line(25, y + 20, 85, y + 20);
  doc.setFontSize(8);
  doc.setTextColor(...MUTED_RGB);
  doc.text('توقيع المزود', w - 55, y + 25, { align: 'center' });
  doc.text('توقيع العميل', 55, y + 25, { align: 'center' });

  normalizeArabicPdfTextLayer(doc);
  return doc;
};

export const exportArabicFontTestPDF = async () => {
  const doc = await buildArabicFontTestPDF();
  runClientVerification(doc);
  doc.save(`qitaat-arabic-font-test-${Date.now()}.pdf`);
  return doc;
};

// PDF-AR3: Build a contract PDF and return raw bytes + blob for analysis.
// Used by the "Export + Analyze" button to upload to the backend verifier
// after triggering the local download.
export const buildContractPdfForAnalysis = async (data: ContractExportData): Promise<{ bytes: Uint8Array; blob: Blob; fileName: string }> => {
  const doc = await buildContractPDF(data);
  runClientVerification(doc);
  const bytes = extractDocBytes(doc);
  const blob = (doc as unknown as { output: (kind: 'blob') => Blob }).output('blob');
  return { bytes, blob, fileName: `contract-${data.contractNumber}.pdf` };
};

// ── Export Measurements as PDF ──
export const exportMeasurementsPDF = async (opts: {
  contractNumber: string;
  businessName?: string;
  currency: string;
  vatRate: number;
  vatInclusive: boolean;
  measurements: { pieceNumber: string; name: string; location: string; floor: string; lengthMm: number; widthMm: number; areaSqm: number; unitPrice: number; quantity: number; totalCost: number; status: string }[];
  isRTL: boolean;
}) => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const fontLoaded = await setupArabicDoc(doc, opts.isRTL);
  const rtlStyles = getArabicTableStyles(opts.isRTL, fontLoaded);

  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  doc.setFillColor(...HEADER_RGB);
  doc.rect(0, 0, w, 20, 'F');
  doc.setFillColor(...ACCENT_RGB);
  doc.rect(0, 20, w, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(opts.isRTL ? 'جدول المقاسات' : 'Measurements Schedule', w / 2, 10, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(...ACCENT_RGB);
  doc.text(`${opts.contractNumber}${opts.businessName ? ' — ' + opts.businessName : ''}`, w / 2, 17, { align: 'center' });

  const totalArea = opts.measurements.reduce((s, m) => s + m.areaSqm, 0);
  const totalCost = opts.measurements.reduce((s, m) => s + m.totalCost, 0);
  const _mvb = calculateVatBreakdown({ amount: totalCost, vatRate: opts.vatRate, vatInclusive: opts.vatInclusive });
  const vat = _mvb.vatAmount;
  const grand = _mvb.total;
  const locale = opts.isRTL ? 'ar-SA-u-nu-latn' : 'en-US';

  autoTable(doc, {
    startY: 25,
    head: [['#', opts.isRTL ? 'رقم القطعة' : 'Piece #', opts.isRTL ? 'الاسم' : 'Name', opts.isRTL ? 'الموقع' : 'Location', opts.isRTL ? 'الدور' : 'Floor', opts.isRTL ? 'الطول مم' : 'L mm', opts.isRTL ? 'العرض مم' : 'W mm', opts.isRTL ? 'المساحة م²' : 'Area m²', opts.isRTL ? 'الكمية' : 'Qty', opts.isRTL ? 'سعر/وحدة' : 'Unit $', opts.isRTL ? 'التكلفة' : 'Cost', opts.isRTL ? 'الحالة' : 'Status']],
    body: opts.measurements.map((m, i) => [
      String(i + 1), m.pieceNumber, m.name, m.location || '-', m.floor || '-',
      String(m.lengthMm), String(m.widthMm), m.areaSqm.toFixed(3), String(m.quantity),
      m.unitPrice.toLocaleString(locale), m.totalCost.toLocaleString(locale), m.status,
    ]),
    foot: [
      ['', '', opts.isRTL ? 'المجموع' : 'Subtotal', '', '', '', '', totalArea.toFixed(3), String(opts.measurements.length), '', totalCost.toLocaleString(locale), ''],
      ['', '', opts.isRTL ? `ضريبة ${opts.vatRate}%` : `VAT ${opts.vatRate}%`, '', '', '', '', '', '', '', vat.toLocaleString(locale, { maximumFractionDigits: 2 }), ''],
      ['', '', opts.isRTL ? 'الإجمالي' : 'Grand Total', '', '', '', '', '', '', '', grand.toLocaleString(locale, { maximumFractionDigits: 2 }) + ' ' + opts.currency, ''],
    ],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2.5, ...rtlStyles },
    headStyles: tableHeadStyles(opts.isRTL, fontLoaded),
    footStyles: tableFootStyles(opts.isRTL, fontLoaded),
    alternateRowStyles: { fillColor: SURFACE2_RGB },
    margin: PDF_DENSE_TABLE_MARGIN,
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED_RGB);
    doc.text(`${opts.isRTL ? 'صفحة' : 'Page'} ${i}/${pages}`, w / 2, h - 5, { align: 'center' });
  }

  doc.save(`measurements-${opts.contractNumber}.pdf`);
};

// ── Print Measurements (native browser print - perfect Arabic support) ──
export const printMeasurements = (opts: {
  contractNumber: string;
  businessName?: string;
  currency: string;
  vatRate: number;
  vatInclusive: boolean;
  measurements: { pieceNumber: string; name: string; location: string; floor: string; lengthMm: number; widthMm: number; areaSqm: number; unitPrice: number; quantity: number; totalCost: number; status: string }[];
  isRTL: boolean;
}) => {
  const locale = opts.isRTL ? 'ar-SA-u-nu-latn' : 'en-US';
  const totalArea = opts.measurements.reduce((s, m) => s + m.areaSqm, 0);
  const totalCost = opts.measurements.reduce((s, m) => s + m.totalCost, 0);
  const _mvc = calculateVatBreakdown({ amount: totalCost, vatRate: opts.vatRate, vatInclusive: opts.vatInclusive });
  const vat = _mvc.vatAmount;
  const grand = _mvc.total;

  const rows = opts.measurements.map((m, i) => `
    <tr>
      <td>${i + 1}</td><td>${m.pieceNumber}</td><td>${m.name}</td>
      <td>${m.location || '-'}</td><td>${m.floor || '-'}</td>
      <td class="num">${m.lengthMm}</td><td class="num">${m.widthMm}</td>
      <td class="num">${m.areaSqm.toFixed(3)}</td><td class="num">${m.quantity}</td>
      <td class="num">${m.unitPrice.toLocaleString(locale)}</td>
      <td class="num">${m.totalCost.toLocaleString(locale)}</td>
      <td>${m.status}</td>
    </tr>`).join('');

  const html = `
    <h1>${opts.isRTL ? 'جدول المقاسات' : 'Measurements Schedule'}</h1>
    <p style="text-align:center;color:#6B7689;margin-bottom:6mm;">${opts.contractNumber}${opts.businessName ? ' — ' + opts.businessName : ''}</p>
    <table>
      <thead><tr>
        <th>#</th><th>${opts.isRTL ? 'رقم القطعة' : 'Piece #'}</th><th>${opts.isRTL ? 'الاسم' : 'Name'}</th>
        <th>${opts.isRTL ? 'الموقع' : 'Location'}</th><th>${opts.isRTL ? 'الدور' : 'Floor'}</th>
        <th>${opts.isRTL ? 'الطول مم' : 'L mm'}</th><th>${opts.isRTL ? 'العرض مم' : 'W mm'}</th>
        <th>${opts.isRTL ? 'المساحة م²' : 'Area m²'}</th><th>${opts.isRTL ? 'الكمية' : 'Qty'}</th>
        <th>${opts.isRTL ? 'سعر/وحدة' : 'Unit $'}</th><th>${opts.isRTL ? 'التكلفة' : 'Cost'}</th>
        <th>${opts.isRTL ? 'الحالة' : 'Status'}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td colspan="7">${opts.isRTL ? 'المجموع' : 'Subtotal'}</td><td class="num">${totalArea.toFixed(3)}</td><td class="num">${opts.measurements.length}</td><td></td><td class="num">${totalCost.toLocaleString(locale)}</td><td></td></tr>
        <tr><td colspan="10">${opts.isRTL ? `ضريبة ${opts.vatRate}%` : `VAT ${opts.vatRate}%`}</td><td class="num">${vat.toLocaleString(locale, { maximumFractionDigits: 2 })}</td><td></td></tr>
        <tr><td colspan="10" style="font-size:10pt">${opts.isRTL ? 'الإجمالي شامل الضريبة' : 'Grand Total'}</td><td class="num" style="font-size:10pt">${grand.toLocaleString(locale, { maximumFractionDigits: 2 })} ${opts.currency}</td><td></td></tr>
      </tfoot>
    </table>`;

  printContractSection(opts.isRTL ? 'جدول المقاسات' : 'Measurements', html, opts.isRTL);
};

// ── Export Measurements as Excel (CSV) ──
export const exportMeasurementsExcel = (opts: {
  contractNumber: string;
  currency: string;
  vatRate: number;
  vatInclusive: boolean;
  measurements: { pieceNumber: string; name: string; location: string; floor: string; lengthMm: number; widthMm: number; areaSqm: number; unitPrice: number; quantity: number; totalCost: number; status: string }[];
  isRTL: boolean;
}) => {
  const headers = opts.isRTL
    ? ['رقم القطعة', 'الاسم', 'الموقع', 'الدور', 'الطول (مم)', 'العرض (مم)', 'المساحة (م²)', 'الكمية', 'سعر الوحدة', 'التكلفة', 'الحالة']
    : ['Piece #', 'Name', 'Location', 'Floor', 'Length (mm)', 'Width (mm)', 'Area (m²)', 'Qty', 'Unit Price', 'Cost', 'Status'];

  const escapeCSV = (val: string | number | boolean | null | undefined) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n') || /[\u0600-\u06FF]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows: (string | number)[][] = opts.measurements.map(m => [
    m.pieceNumber, m.name, m.location || '', m.floor || '',
    m.lengthMm, m.widthMm, m.areaSqm.toFixed(3), m.quantity,
    m.unitPrice, m.totalCost, m.status,
  ]);

  const totalCost = opts.measurements.reduce((s, m) => s + m.totalCost, 0);
  const _mvd = calculateVatBreakdown({ amount: totalCost, vatRate: opts.vatRate, vatInclusive: opts.vatInclusive });
  const vat = _mvd.vatAmount;
  const grand = _mvd.total;

  rows.push([]);
  rows.push([opts.isRTL ? 'المجموع' : 'Subtotal', '', '', '', '', '', '', '', '', totalCost, '']);
  rows.push([opts.isRTL ? `ضريبة ${opts.vatRate}%` : `VAT ${opts.vatRate}%`, '', '', '', '', '', '', '', '', Number(vat.toFixed(2)), '']);
  rows.push([opts.isRTL ? 'الإجمالي شامل الضريبة' : 'Grand Total', '', '', '', '', '', '', '', '', Number(grand.toFixed(2)), opts.currency]);

  const BOM = '\uFEFF';
  const csv = BOM + [headers.map(escapeCSV).join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `measurements-${opts.contractNumber}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

// ── Parse measurements from uploaded CSV ──
export interface ImportedMeasurement {
  name_ar: string;
  piece_number: string;
  floor_label: string;
  location_ar: string;
  length_mm: number;
  width_mm: number;
  quantity: number;
  unit_price: number;
  notes: string;
}

export const parseMeasurementsFromCSV = (text: string): ImportedMeasurement[] => {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const results: ImportedMeasurement[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 6) continue;
    const length_mm = Number(cols[4]) || 0;
    const width_mm = Number(cols[5]) || 0;
    const quantity = Number(cols[7]) || 1;
    const unit_price = Number(cols[8]) || 0;
    if (!cols[1] || (length_mm === 0 && width_mm === 0)) continue;

    results.push({
      name_ar: cols[1] || '',
      piece_number: cols[0] || '',
      floor_label: mapFloorLabel(cols[3] || ''),
      location_ar: cols[2] || '',
      length_mm, width_mm, quantity, unit_price,
      notes: cols[10] || '',
    });
  }
  return results;
};

function mapFloorLabel(raw: string): string {
  const lower = raw.toLowerCase().trim();
  if (lower.includes('ground') || lower.includes('أرضي')) return 'ground_floor';
  if (lower.includes('first') || lower.includes('أول') || lower === '1') return 'first_floor';
  if (lower.includes('second') || lower.includes('ثاني') || lower === '2') return 'second_floor';
  if (lower.includes('roof') || lower.includes('سطح')) return 'roof';
  if (lower.includes('basement') || lower.includes('قبو')) return 'basement';
  if (lower.includes('external') || lower.includes('خارجي')) return 'external';
  return raw || 'ground_floor';
}

