/**
 * Single-lead Arabic PDF export. Reuses the project's bundled Noto Naskh
 * font via `registerArabicFont` so RTL fields render correctly. Falls back
 * to Helvetica gracefully if the font fails to load (logs but still emits
 * a readable English-only sheet).
 */
import jsPDF from 'jspdf';
import { registerArabicFont } from '@/lib/pdf-arabic-font';
import type { ProviderLeadRow } from '@/modules/providers';
import {
  STATUS_LABEL,
  computeCompleteness,
  computeLeadScore,
  computeSlaStatus,
  parseLeadMeta,
} from './providerLeadHelpers';

const MARGIN = 14;

export interface ExportLeadPdfOptions {
  /** When true, opens a print/preview window instead of force-downloading. */
  preview?: boolean;
}

export async function exportLeadPdf(
  lead: ProviderLeadRow,
  options: ExportLeadPdfOptions = {},
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const fontOk = await registerArabicFont(doc);
  // Full RTL layout: jsPDF mirrors text alignment and the default origin
  // when R2L is on, which keeps Arabic paragraphs reading right→left even
  // when wrapping over multiple lines.
  doc.setR2L(true);
  const setFont = (bold = false) => {
    if (fontOk) doc.setFont('ArabicFont', bold ? 'bold' : 'normal');
    else doc.setFont('helvetica', bold ? 'bold' : 'normal');
  };

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  const score = computeLeadScore(lead);
  const c = computeCompleteness(lead);
  const sla = computeSlaStatus(lead);
  const { meta } = parseLeadMeta(lead.admin_notes);

  // Header band
  doc.setFillColor(15, 76, 71); // industrial green
  // Long names: dynamic header height so the title never clips.
  setFont(true);
  doc.setFontSize(16);
  const titleRaw = lead.name_ar || lead.name_en || lead.reference_code;
  const titleLines = doc.splitTextToSize(titleRaw, contentW - 60) as string[];
  const headerH = Math.max(26, 12 + titleLines.length * 7);
  doc.rect(0, 0, pageW, headerH, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(titleLines, pageW - MARGIN, 11, { align: 'right' });
  setFont(false);
  doc.setFontSize(9);
  const subY = headerH - 6;
  doc.text(`${lead.reference_code} · ${STATUS_LABEL[lead.status].ar}`, pageW - MARGIN, subY, { align: 'right' });
  doc.text(`Lead Score: ${score}/100 · Completeness: ${c.pct}%`, MARGIN, subY);

  doc.setTextColor(20, 20, 20);
  let y = headerH + 10;

  const row = (labelAr: string, value: string | null | undefined) => {
    if (!value) return;
    setFont(true);
    doc.setFontSize(10);
    doc.text(`${labelAr}:`, pageW - MARGIN, y, { align: 'right' });
    setFont(false);
    doc.setFontSize(10);
    const txt = String(value);
    const wrapped = doc.splitTextToSize(txt, contentW - 40) as string[];
    doc.text(wrapped, pageW - MARGIN - 38, y, { align: 'right' });
    y += Math.max(6, wrapped.length * 5) + 1;
    if (y > pageH - 20) {
      doc.addPage();
      y = MARGIN;
    }
  };

  setFont(true);
  doc.setFontSize(12);
  doc.text('بيانات المنشأة', pageW - MARGIN, y, { align: 'right' });
  y += 7;
  doc.setDrawColor(220);
  doc.line(MARGIN, y - 4, pageW - MARGIN, y - 4);

  row('الاسم بالعربية', lead.name_ar);
  row('الاسم بالإنجليزية', lead.name_en);
  row('المسؤول', lead.contact_name);
  row('البريد', lead.email);
  row('الجوال', lead.phone);
  row('قناة التواصل', lead.preferred_channel);
  row('المدينة', lead.city);
  row('النشاط', lead.main_activity);
  row('السجل التجاري', lead.cr_number);
  row('الرقم الموحّد', lead.unified_number);
  row('الرقم الضريبي', lead.vat_number);
  row('الموقع', lead.website);
  row('عدد الفروع', String(lead.branches_count));
  if (lead.specialties.length) row('التخصصات', lead.specialties.join('، '));
  if (lead.brands.length) row('العلامات', lead.brands.join('، '));
  if (lead.brief) row('نبذة', lead.brief);

  y += 4;
  setFont(true);
  doc.setFontSize(12);
  doc.text('الاعتماد والمتابعة', pageW - MARGIN, y, { align: 'right' });
  y += 7;
  doc.line(MARGIN, y - 4, pageW - MARGIN, y - 4);
  row('الحالة', STATUS_LABEL[lead.status].ar);
  row('SLA', `${sla.ageDays} يوم${sla.overdue ? ' — متأخر' : ''}`);
  if (meta.ownerName) row('المسؤول', meta.ownerName);
  if (c.missing.length) row('حقول ناقصة', c.missing.join('، '));

  // Footer
  setFont(false);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.setR2L(false);
  doc.text(`Qitaat · Provider lead · ${new Date().toLocaleString()}`, MARGIN, pageH - 8);

  const fname = `lead-${lead.reference_code || lead.id}.pdf`;
  if (options.preview && typeof window !== 'undefined') {
    // Open in a new tab so the operator can preview and choose Print or Save.
    const blobUrl = doc.output('bloburl') as unknown as string;
    const w = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    if (!w) doc.save(fname); // popup blocked → fall back to download
  } else {
    doc.save(fname);
  }
}