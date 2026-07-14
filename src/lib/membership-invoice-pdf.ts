/**
 * M5.1 — KSA-compliant simplified tax invoice PDF (فاتورة ضريبية مبسطة)
 * for membership payments.
 *
 * Design notes:
 * - Reuses the existing contract PDF pipeline: jsPDF + jspdf-autotable +
 *   the shared Arabic font loader in `src/lib/pdf-arabic-font.ts`.
 * - Arabic-first RTL layout, bilingual field labels (AR + EN).
 * - VAT breakdown is rendered ONLY when `sellerVatNumber` is a non-empty
 *   string. When empty, the invoice explicitly notes that the amount is
 *   not subject to VAT under the current registration. We NEVER
 *   fabricate a VAT number.
 * - No PII beyond what the caller already sees on the in-app invoice
 *   page (business name, user display name, email if provided).
 */
import { setupArabicDoc, getArabicTableStyles } from './pdf-arabic-font';

export interface MembershipInvoiceData {
  isRTL: boolean;
  documentTitleAr: string;
  documentTitleEn: string;
  invoiceNumber: string;              // INV-YYYY-NNNNNN or fallback ref_id
  documentRef: string | null;         // ref_id of the payment intent
  issuedAt: string;                   // ISO
  paidAt: string | null;              // ISO
  seller: {
    legalNameAr: string;
    legalNameEn: string;
    vatNumber: string | null;         // empty/null → hide VAT block
    commercialRegistration: string | null;
  };
  buyer: {
    displayName: string | null;
    businessNameAr: string | null;
    businessNameEn: string | null;
    businessRef: string | null;
    email: string | null;
  };
  plan: {
    nameAr: string | null;
    nameEn: string | null;
    tier: string | null;
  };
  billingCycle: string | null;        // monthly | yearly
  periodStart: string | null;         // ISO
  periodEnd: string | null;           // ISO
  amount: number;                     // total charged (major units)
  currency: string;                   // e.g. SAR
  paymentProvider: string | null;     // moyasar | manual
  paymentReference: string | null;    // provider_intent_id or manual ref
}

const HEADER_RGB: [number, number, number] = [19, 23, 34];
const TEXT_RGB: [number, number, number]   = [26, 34, 48];
const MUTED_RGB: [number, number, number]  = [107, 118, 137];
const ACCENT_RGB: [number, number, number] = [14, 158, 111];
const HIGHLIGHT_RGB: [number, number, number] = [230, 247, 240];

const VAT_RATE = 0.15; // KSA standard 15%

const fmtDate = (iso: string | null, isRTL: boolean): string => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(isRTL ? 'ar-SA-u-nu-latn' : 'en-GB', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  } catch { return iso; }
};

const fmtMoney = (n: number, currency: string): string =>
  `${n.toFixed(2)} ${currency}`;

const cycleLabel = (c: string | null, isRTL: boolean): string => {
  const v = (c ?? '').toLowerCase();
  if (v === 'yearly' || v === 'annual') return isRTL ? 'سنوي' : 'Yearly';
  if (v === 'monthly') return isRTL ? 'شهري' : 'Monthly';
  return '—';
};

const providerLabel = (p: string | null, isRTL: boolean): string => {
  const v = (p ?? '').toLowerCase();
  if (v === 'moyasar') return isRTL ? 'ميسر (Moyasar)' : 'Moyasar';
  if (v === 'manual') return isRTL ? 'تحويل يدوي' : 'Manual transfer';
  return p ?? '—';
};

/**
 * Build a jsPDF document for the given invoice data and return the raw bytes
 * ready to be uploaded to storage or downloaded directly.
 */
export async function buildMembershipInvoicePdf(
  data: MembershipInvoiceData,
): Promise<Uint8Array> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const fontLoaded = await setupArabicDoc(doc, data.isRTL);
  const styles = getArabicTableStyles(data.isRTL, fontLoaded);
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightX = pageWidth - 16;
  const leftX = 16;
  const isRTL = data.isRTL;
  const alignEnd = isRTL ? 'right' as const : 'left' as const;

  const setFont = (style: 'normal' | 'bold' = 'normal') => {
    if (fontLoaded) doc.setFont('ArabicFont', style);
    else doc.setFont('Helvetica', style);
  };

  // ── Header band ─────────────────────────────────────────────────────
  doc.setFillColor(...HEADER_RGB);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setTextColor(255, 255, 255);
  setFont('bold');
  doc.setFontSize(15);
  doc.text(
    isRTL ? data.documentTitleAr : data.documentTitleEn,
    isRTL ? rightX : leftX, 12,
    { align: alignEnd },
  );
  setFont('normal');
  doc.setFontSize(9);
  doc.text(
    isRTL ? 'فاتورة ضريبية مبسطة  —  Simplified Tax Invoice'
          : 'Simplified Tax Invoice  —  فاتورة ضريبية مبسطة',
    isRTL ? rightX : leftX, 19,
    { align: alignEnd },
  );
  doc.text(
    `qitaat.com`,
    isRTL ? leftX : rightX, 19,
    { align: isRTL ? 'left' : 'right' },
  );

  // ── Meta strip ──────────────────────────────────────────────────────
  doc.setTextColor(...TEXT_RGB);
  setFont('bold');
  doc.setFontSize(10);
  const metaY = 36;
  doc.text(
    isRTL ? `رقم الفاتورة / Invoice No: ${data.invoiceNumber}`
          : `Invoice No / رقم الفاتورة: ${data.invoiceNumber}`,
    isRTL ? rightX : leftX, metaY, { align: alignEnd },
  );
  setFont('normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED_RGB);
  doc.text(
    isRTL ? `تاريخ الإصدار / Issued: ${fmtDate(data.issuedAt, isRTL)}`
          : `Issued / تاريخ الإصدار: ${fmtDate(data.issuedAt, isRTL)}`,
    isRTL ? rightX : leftX, metaY + 5, { align: alignEnd },
  );
  doc.text(
    isRTL ? `تاريخ الدفع / Paid at: ${fmtDate(data.paidAt, isRTL)}`
          : `Paid at / تاريخ الدفع: ${fmtDate(data.paidAt, isRTL)}`,
    isRTL ? rightX : leftX, metaY + 10, { align: alignEnd },
  );
  if (data.documentRef && data.documentRef !== data.invoiceNumber) {
    doc.text(
      isRTL ? `مرجع الدفع / Payment ref: ${data.documentRef}`
            : `Payment ref / مرجع الدفع: ${data.documentRef}`,
      isRTL ? rightX : leftX, metaY + 15, { align: alignEnd },
    );
  }

  // ── Seller / Buyer blocks ───────────────────────────────────────────
  const partiesY = 60;
  autoTable(doc, {
    startY: partiesY,
    theme: 'grid',
    styles: { ...styles, fontSize: 8, cellPadding: 3, textColor: TEXT_RGB },
    headStyles: {
      fillColor: HEADER_RGB, textColor: [255, 255, 255], fontStyle: 'bold',
      halign: alignEnd, ...(fontLoaded ? { font: 'ArabicFont' } : {}),
    },
    head: [[
      isRTL ? 'البائع / Seller' : 'Seller / البائع',
      isRTL ? 'المشتري / Buyer' : 'Buyer / المشتري',
    ]],
    body: [[
      [
        isRTL ? data.seller.legalNameAr : data.seller.legalNameEn,
        isRTL ? data.seller.legalNameEn : data.seller.legalNameAr,
        data.seller.vatNumber
          ? (isRTL ? `الرقم الضريبي: ${data.seller.vatNumber}` : `VAT No: ${data.seller.vatNumber}`)
          : (isRTL ? 'الرقم الضريبي: غير مسجل' : 'VAT No: not registered'),
        data.seller.commercialRegistration
          ? (isRTL ? `السجل التجاري: ${data.seller.commercialRegistration}`
                   : `CR: ${data.seller.commercialRegistration}`)
          : '',
      ].filter(Boolean).join('\n'),
      [
        isRTL
          ? (data.buyer.businessNameAr || data.buyer.businessNameEn || data.buyer.displayName || '—')
          : (data.buyer.businessNameEn || data.buyer.businessNameAr || data.buyer.displayName || '—'),
        data.buyer.businessRef
          ? (isRTL ? `مرجع الحساب: ${data.buyer.businessRef}` : `Account ref: ${data.buyer.businessRef}`)
          : '',
        data.buyer.displayName && (data.buyer.businessNameAr || data.buyer.businessNameEn)
          ? (isRTL ? `المستخدم: ${data.buyer.displayName}` : `Contact: ${data.buyer.displayName}`)
          : '',
        data.buyer.email
          ? (isRTL ? `البريد: ${data.buyer.email}` : `Email: ${data.buyer.email}`)
          : '',
      ].filter(Boolean).join('\n'),
    ]],
    margin: { left: leftX, right: leftX },
  });

  // ── Line item table ─────────────────────────────────────────────────
  const planName = isRTL
    ? (data.plan.nameAr || data.plan.nameEn || 'العضوية')
    : (data.plan.nameEn || data.plan.nameAr || 'Membership');
  const cycle = cycleLabel(data.billingCycle, isRTL);
  const periodText = (data.periodStart || data.periodEnd)
    ? `${fmtDate(data.periodStart, isRTL)}  —  ${fmtDate(data.periodEnd, isRTL)}`
    : '';
  const descriptionCell = [
    isRTL
      ? `اشتراك عضوية «${planName}» (${cycle})`
      : `${planName} membership subscription (${cycle})`,
    periodText
      ? (isRTL ? `الفترة: ${periodText}` : `Period: ${periodText}`)
      : '',
    data.plan.tier
      ? (isRTL ? `المستوى: ${data.plan.tier}` : `Tier: ${data.plan.tier}`)
      : '',
  ].filter(Boolean).join('\n');

  const total = data.amount;
  const hasVat = !!data.seller.vatNumber && data.seller.vatNumber.trim().length > 0;
  const netExVat = hasVat ? total / (1 + VAT_RATE) : total;
  const vatAmt = hasVat ? total - netExVat : 0;

  autoTable(doc, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startY: (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : 100,
    theme: 'grid',
    styles: { ...styles, fontSize: 9, cellPadding: 3, textColor: TEXT_RGB },
    headStyles: {
      fillColor: HEADER_RGB, textColor: [255, 255, 255], fontStyle: 'bold',
      halign: alignEnd, ...(fontLoaded ? { font: 'ArabicFont' } : {}),
    },
    head: [[
      isRTL ? '#' : '#',
      isRTL ? 'الوصف / Description' : 'Description / الوصف',
      isRTL ? 'الكمية' : 'Qty',
      isRTL ? 'السعر' : 'Unit',
      isRTL ? 'المجموع' : 'Amount',
    ]],
    body: [[
      '1',
      descriptionCell,
      '1',
      fmtMoney(hasVat ? netExVat : total, data.currency),
      fmtMoney(hasVat ? netExVat : total, data.currency),
    ]],
    margin: { left: leftX, right: leftX },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 32, halign: alignEnd },
      4: { cellWidth: 32, halign: alignEnd },
    },
  });

  // ── Totals block ────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalsY = ((doc as any).lastAutoTable?.finalY ?? 140) + 4;
  const totalsBody: (string | number)[][] = [];
  if (hasVat) {
    totalsBody.push([
      isRTL ? 'المجموع قبل الضريبة / Subtotal' : 'Subtotal / المجموع قبل الضريبة',
      fmtMoney(netExVat, data.currency),
    ]);
    totalsBody.push([
      isRTL ? 'ضريبة القيمة المضافة 15% / VAT 15%' : 'VAT 15% / ضريبة القيمة المضافة',
      fmtMoney(vatAmt, data.currency),
    ]);
  }
  totalsBody.push([
    isRTL ? 'الإجمالي المستحق / Total due' : 'Total due / الإجمالي المستحق',
    fmtMoney(total, data.currency),
  ]);

  autoTable(doc, {
    startY: totalsY,
    theme: 'grid',
    styles: { ...styles, fontSize: 9, cellPadding: 3, textColor: TEXT_RGB },
    body: totalsBody,
    margin: { left: pageWidth / 2, right: leftX },
    columnStyles: {
      0: { fontStyle: 'bold', halign: alignEnd, fillColor: HIGHLIGHT_RGB, textColor: TEXT_RGB },
      1: { halign: alignEnd, fontStyle: 'bold' },
    },
  });

  // ── Payment info block ──────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payY = ((doc as any).lastAutoTable?.finalY ?? totalsY + 30) + 8;
  setFont('bold');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_RGB);
  doc.text(
    isRTL ? 'معلومات الدفع  /  Payment details' : 'Payment details  /  معلومات الدفع',
    isRTL ? rightX : leftX, payY, { align: alignEnd },
  );
  setFont('normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED_RGB);
  const payLines = [
    isRTL
      ? `طريقة الدفع / Method: ${providerLabel(data.paymentProvider, isRTL)}`
      : `Method / طريقة الدفع: ${providerLabel(data.paymentProvider, isRTL)}`,
    data.paymentReference
      ? (isRTL
          ? `المرجع الخارجي / Reference: ${data.paymentReference}`
          : `Reference / المرجع الخارجي: ${data.paymentReference}`)
      : (isRTL ? 'المرجع الخارجي: —' : 'Reference: —'),
  ];
  payLines.forEach((line, i) => {
    doc.text(line, isRTL ? rightX : leftX, payY + 6 + i * 5, { align: alignEnd });
  });

  // ── Footer / VAT compliance note ────────────────────────────────────
  const footerY = doc.internal.pageSize.getHeight() - 22;
  doc.setDrawColor(220);
  doc.line(leftX, footerY - 2, pageWidth - leftX, footerY - 2);
  setFont('normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED_RGB);
  const footNote = hasVat
    ? (isRTL
        ? 'هذه فاتورة ضريبية مبسطة صادرة إلكترونياً وفق نظام ضريبة القيمة المضافة في المملكة العربية السعودية.'
        : 'Simplified Tax Invoice issued electronically per KSA VAT regulations.')
    : (isRTL
        ? 'وثيقة صادرة إلكترونياً. لم يتم احتساب ضريبة القيمة المضافة لعدم تسجيل الرقم الضريبي.'
        : 'Electronic invoice. VAT is not charged — VAT registration number is not configured.');
  doc.text(footNote, isRTL ? rightX : leftX, footerY + 4, { align: alignEnd, maxWidth: pageWidth - 32 });
  doc.setTextColor(...ACCENT_RGB);
  doc.text(
    isRTL ? 'منصة قطاعات  qitaat.com' : 'Qitaat Platform  qitaat.com',
    isRTL ? leftX : rightX, footerY + 4,
    { align: isRTL ? 'left' : 'right' },
  );

  return new Uint8Array((doc as unknown as { output: (k: 'arraybuffer') => ArrayBuffer })
    .output('arraybuffer'));
}
