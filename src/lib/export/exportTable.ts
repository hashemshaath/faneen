/**
 * Generic CSV + PDF export utility for dashboard tables.
 * - CSV: UTF-8 BOM, Excel-safe; safe for Arabic.
 * - PDF: jsPDF + autoTable, registers Arabic font when isRTL.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { setupArabicDoc, getArabicTableStyles } from '@/lib/pdf-arabic-font';

export type ExportColumn<T> = {
  key: string;
  header: string;
  accessor: (row: T) => string | number | null | undefined;
};

function escapeCsv(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportToCSV<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  filename: string,
): void {
  const head = columns.map((c) => escapeCsv(c.header)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escapeCsv(c.accessor(row))).join(','))
    .join('\r\n');
  // UTF-8 BOM so Excel reads Arabic correctly
  const csv = `\uFEFF${head}\r\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

export async function exportToPDF<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  options: { title: string; subtitle?: string; filename: string; isRTL?: boolean },
): Promise<void> {
  const { title, subtitle, filename, isRTL = false } = options;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  let fontLoaded = false;
  if (isRTL) {
    try {
      await setupArabicDoc(doc, true);
      fontLoaded = true;
    } catch {
      fontLoaded = false;
    }
  }

  const pageW = doc.internal.pageSize.getWidth();
  doc.setFontSize(14);
  doc.text(title, isRTL ? pageW - 14 : 14, 14, { align: isRTL ? 'right' : 'left' });
  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(subtitle, isRTL ? pageW - 14 : 14, 20, { align: isRTL ? 'right' : 'left' });
    doc.setTextColor(0);
  }

  const head = [columns.map((c) => c.header)];
  const body = rows.map((row) => columns.map((c) => {
    const v = c.accessor(row);
    return v === null || v === undefined ? '' : String(v);
  }));

  const arabicStyles = isRTL && fontLoaded ? getArabicTableStyles(true, true) : null;
  autoTable(doc, {
    startY: subtitle ? 26 : 20,
    head,
    body,
    styles: { fontSize: 9, ...(arabicStyles ?? {}) },
    headStyles: { fillColor: [16, 185, 129] },
    margin: { left: 10, right: 10 },
  });

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
