import { setupArabicDoc, getArabicTableStyles, printContractSection } from './pdf-arabic-font';

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
  milestones: { title: string; amount: number; dueDate?: string; status: string }[];
  measurements?: { pieceNumber: string; name: string; location: string; floor: string; lengthMm: number; widthMm: number; areaSqm: number; unitPrice: number; quantity: number; totalCost: number; status: string }[];
  vatRate?: number;
  vatInclusive?: boolean;
  businessName?: string;
  businessLogo?: string;
  isRTL: boolean;
}

export const exportContractPDF = async (data: ContractExportData) => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const fontLoaded = await setupArabicDoc(doc, data.isRTL);
  const rtlStyles = getArabicTableStyles(data.isRTL, fontLoaded);

  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  let y = 15;

  const accentR = 180, accentG = 140, accentB = 60;
  const darkR = 24, darkG = 24, darkB = 32;

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
  doc.setTextColor(200, 200, 200);
  doc.text(data.title.slice(0, 80), w / 2, 31, { align: 'center' });
  if (data.businessName) {
    doc.setFontSize(8);
    doc.text(data.businessName, w / 2, 37, { align: 'center' });
  }

  y = 50;
  doc.setTextColor(0, 0, 0);

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
    styles: { fontSize: 9, cellPadding: 3.5, ...rtlStyles, lineColor: [230, 230, 230], lineWidth: 0.2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45, textColor: [100, 100, 100] } },
    margin: { left: 15, right: 15 },
    alternateRowStyles: { fillColor: [248, 248, 248] },
  });
  y = (doc as Record<string, unknown> & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  // ── Financial ──
  sectionTitle(data.isRTL ? 'البيانات المالية' : 'Financial Summary');
  const vatRate = data.vatRate ?? 15;
  const vatInclusive = data.vatInclusive ?? false;
  const vatAmount = vatInclusive ? (data.totalAmount * vatRate) / (100 + vatRate) : (data.totalAmount * vatRate) / 100;
  const subtotal = vatInclusive ? data.totalAmount - vatAmount : data.totalAmount;
  const grandTotal = vatInclusive ? data.totalAmount : data.totalAmount + vatAmount;

  const fmtNum = (n: number) => n.toLocaleString(data.isRTL ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2 });

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
    styles: { fontSize: 9, cellPadding: 3.5, ...rtlStyles, lineColor: [230, 230, 230], lineWidth: 0.2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55, textColor: [100, 100, 100] } },
    margin: { left: 15, right: 15 },
    didParseCell: (hookData: Record<string, unknown>) => {
      if (hookData.row.index === 2) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [255, 248, 230];
      }
    },
  });
  y = (doc as Record<string, unknown> & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  // ── Milestones ──
  if (data.milestones.length > 0) {
    sectionTitle(data.isRTL ? 'مراحل التنفيذ' : 'Milestones');
    autoTable(doc, {
      startY: y,
      head: [['#', data.isRTL ? 'المرحلة' : 'Milestone', data.isRTL ? 'المبلغ' : 'Amount', data.isRTL ? 'التاريخ' : 'Due Date', data.isRTL ? 'الحالة' : 'Status']],
      body: data.milestones.map((m, i) => [
        String(i + 1), m.title,
        `${m.amount.toLocaleString(data.isRTL ? 'ar-SA' : 'en-US')} ${data.currency}`,
        m.dueDate || '-', m.status,
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3, ...rtlStyles },
      headStyles: { fillColor: [darkR, darkG, darkB], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 15, right: 15 },
    });
    y = (doc as Record<string, unknown> & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  // ── Measurements ──
  if (data.measurements && data.measurements.length > 0) {
    sectionTitle(data.isRTL ? 'جدول المقاسات' : 'Measurements Schedule');
    const totalArea = data.measurements.reduce((s, m) => s + m.areaSqm, 0);
    const totalCost = data.measurements.reduce((s, m) => s + m.totalCost, 0);
    const mVat = vatInclusive ? totalCost * vatRate / (100 + vatRate) : totalCost * vatRate / 100;
    const mGrand = vatInclusive ? totalCost : totalCost + mVat;

    autoTable(doc, {
      startY: y,
      head: [['#', data.isRTL ? 'القطعة' : 'Piece', data.isRTL ? 'الموقع' : 'Location', data.isRTL ? 'الدور' : 'Floor', data.isRTL ? 'الأبعاد (مم)' : 'Dims (mm)', data.isRTL ? 'المساحة م²' : 'Area m²', data.isRTL ? 'سعر/وحدة' : 'Unit $', data.isRTL ? 'الكمية' : 'Qty', data.isRTL ? 'التكلفة' : 'Cost']],
      body: data.measurements.map(m => [
        m.pieceNumber, m.name, m.location || '-', m.floor || '-',
        `${m.lengthMm}×${m.widthMm}`, m.areaSqm.toFixed(3),
        m.unitPrice.toLocaleString(data.isRTL ? 'ar-SA' : 'en-US'),
        String(m.quantity), m.totalCost.toLocaleString(data.isRTL ? 'ar-SA' : 'en-US'),
      ]),
      foot: [
        ['', data.isRTL ? 'المجموع' : 'Subtotal', '', '', '', totalArea.toFixed(3), '', String(data.measurements.length), totalCost.toLocaleString(data.isRTL ? 'ar-SA' : 'en-US')],
        ['', data.isRTL ? `ضريبة ${vatRate}%` : `VAT ${vatRate}%`, '', '', '', '', '', '', mVat.toLocaleString(data.isRTL ? 'ar-SA' : 'en-US', { maximumFractionDigits: 2 })],
        ['', data.isRTL ? 'الإجمالي شامل الضريبة' : 'Grand Total', '', '', '', '', '', '', mGrand.toLocaleString(data.isRTL ? 'ar-SA' : 'en-US', { maximumFractionDigits: 2 })],
      ],
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2.5, ...rtlStyles },
      headStyles: { fillColor: [darkR, darkG, darkB], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      footStyles: { fillColor: [255, 248, 230], fontStyle: 'bold', fontSize: 7 },
      margin: { left: 10, right: 10 },
    });
    y = (doc as Record<string, unknown> & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  // ── Terms ──
  if (data.terms) {
    sectionTitle(data.isRTL ? 'الشروط والالتزامات' : 'Terms & Conditions');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    const lines = doc.splitTextToSize(data.terms, w - 30);
    if (y + lines.length * 4 > h - 20) { doc.addPage(); y = 15; }
    doc.text(lines, data.isRTL ? w - 15 : 15, y, { align: data.isRTL ? 'right' : 'left' });
    y += lines.length * 4 + 12;
  }

  // ── Signatures ──
  if (y > h - 45) { doc.addPage(); y = 15; }
  y += 5;
  doc.setFillColor(248, 248, 248);
  doc.rect(15, y, w - 30, 35, 'F');
  doc.setDrawColor(accentR, accentG, accentB);
  doc.setLineWidth(0.5);
  doc.line(25, y + 25, 85, y + 25);
  doc.line(w - 85, y + 25, w - 25, y + 25);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(data.isRTL ? 'توقيع المزود' : 'Client Signature', 55, y + 30, { align: 'center' });
  doc.text(data.isRTL ? 'توقيع العميل' : 'Provider Signature', w - 55, y + 30, { align: 'center' });

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(accentR, accentG, accentB);
    doc.rect(0, h - 10, w, 0.5, 'F');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`${data.isRTL ? 'صفحة' : 'Page'} ${i}/${pageCount}`, w / 2, h - 5, { align: 'center' });
    doc.text(data.contractNumber, 15, h - 5);
    doc.text(new Date().toLocaleDateString(data.isRTL ? 'ar-SA' : 'en-US'), w - 15, h - 5, { align: 'right' });
  }

  doc.save(`contract-${data.contractNumber}.pdf`);
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

  doc.setFillColor(24, 24, 32);
  doc.rect(0, 0, w, 20, 'F');
  doc.setFillColor(180, 140, 60);
  doc.rect(0, 20, w, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(opts.isRTL ? 'جدول المقاسات' : 'Measurements Schedule', w / 2, 10, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(180, 140, 60);
  doc.text(`${opts.contractNumber}${opts.businessName ? ' — ' + opts.businessName : ''}`, w / 2, 17, { align: 'center' });

  const totalArea = opts.measurements.reduce((s, m) => s + m.areaSqm, 0);
  const totalCost = opts.measurements.reduce((s, m) => s + m.totalCost, 0);
  const vat = opts.vatInclusive ? totalCost * opts.vatRate / (100 + opts.vatRate) : totalCost * opts.vatRate / 100;
  const grand = opts.vatInclusive ? totalCost : totalCost + vat;
  const locale = opts.isRTL ? 'ar-SA' : 'en-US';

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
    headStyles: { fillColor: [24, 24, 32], textColor: [255, 255, 255], fontStyle: 'bold' },
    footStyles: { fillColor: [255, 248, 230], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: 10, right: 10 },
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
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
  const locale = opts.isRTL ? 'ar-SA' : 'en-US';
  const totalArea = opts.measurements.reduce((s, m) => s + m.areaSqm, 0);
  const totalCost = opts.measurements.reduce((s, m) => s + m.totalCost, 0);
  const vat = opts.vatInclusive ? totalCost * opts.vatRate / (100 + opts.vatRate) : totalCost * opts.vatRate / 100;
  const grand = opts.vatInclusive ? totalCost : totalCost + vat;

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
    <p style="text-align:center;color:#888;margin-bottom:6mm;">${opts.contractNumber}${opts.businessName ? ' — ' + opts.businessName : ''}</p>
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

  const escapeCSV = (val: unknown) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n') || /[\u0600-\u06FF]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows: unknown[][] = opts.measurements.map(m => [
    m.pieceNumber, m.name, m.location || '', m.floor || '',
    m.lengthMm, m.widthMm, m.areaSqm.toFixed(3), m.quantity,
    m.unitPrice, m.totalCost, m.status,
  ]);

  const totalCost = opts.measurements.reduce((s, m) => s + m.totalCost, 0);
  const vat = opts.vatInclusive ? totalCost * opts.vatRate / (100 + opts.vatRate) : totalCost * opts.vatRate / 100;
  const grand = opts.vatInclusive ? totalCost : totalCost + vat;

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
