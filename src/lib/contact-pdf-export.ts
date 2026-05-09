import { setupArabicDoc, getArabicTableStyles } from './pdf-arabic-font';

export type ContactExportField =
  | 'ticket_number'
  | 'name'
  | 'email'
  | 'subject'
  | 'message'
  | 'status'
  | 'priority'
  | 'work_state'
  | 'assigned_to_name'
  | 'starred'
  | 'internal_notes'
  | 'created_at'
  | 'replied_at'
  | 'response_hours'
  | 'ai_priority'
  | 'ai_category'
  | 'ai_summary';

export interface ContactExportRow {
  ticket_number?: string | null;
  name: string;
  email: string;
  subject?: string | null;
  message: string;
  status: string;
  priority: string;
  work_state?: string | null;
  assigned_to_name?: string | null;
  starred: boolean;
  internal_notes?: string | null;
  created_at: string;
  replied_at?: string | null;
  response_hours?: number | null;
  ai_priority?: string | null;
  ai_category?: string | null;
  ai_summary?: string | null;
}

const FIELD_LABELS: Record<ContactExportField, { ar: string; en: string }> = {
  ticket_number:    { ar: 'رقم التذكرة', en: 'Ticket' },
  name:             { ar: 'الاسم',        en: 'Name' },
  email:            { ar: 'البريد',       en: 'Email' },
  subject:          { ar: 'الموضوع',      en: 'Subject' },
  message:          { ar: 'الرسالة',      en: 'Message' },
  status:           { ar: 'الحالة',       en: 'Status' },
  priority:         { ar: 'الأولوية',     en: 'Priority' },
  work_state:       { ar: 'سير العمل',    en: 'Work state' },
  assigned_to_name: { ar: 'المسؤول',      en: 'Assignee' },
  starred:          { ar: 'مهمة',         en: 'Starred' },
  internal_notes:   { ar: 'ملاحظات',      en: 'Notes' },
  created_at:       { ar: 'تاريخ الإنشاء', en: 'Created' },
  replied_at:       { ar: 'تاريخ الرد',   en: 'Replied' },
  response_hours:   { ar: 'زمن الرد (س)', en: 'Response (h)' },
  ai_priority:      { ar: 'AI الأولوية',  en: 'AI Priority' },
  ai_category:      { ar: 'AI التصنيف',   en: 'AI Category' },
  ai_summary:       { ar: 'AI الملخص',    en: 'AI Summary' },
};

const fmt = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? '✓' : '';
  if (v instanceof Date) return v.toISOString().slice(0, 16).replace('T', ' ');
  return String(v);
};

export const fieldLabel = (f: ContactExportField, isRTL: boolean) =>
  isRTL ? FIELD_LABELS[f].ar : FIELD_LABELS[f].en;

export const exportContactsCSV = (
  rows: ContactExportRow[],
  fields: ContactExportField[],
  isRTL: boolean,
) => {
  const headers = fields.map(f => fieldLabel(f, isRTL));
  const lines = rows.map(r =>
    fields.map(f => {
      const v = (r as Record<string, unknown>)[f];
      const s = fmt(v).replace(/[\r\n]+/g, ' ').replace(/"/g, '""');
      return `"${s}"`;
    }).join(','),
  );
  const csv = '\uFEFF' + [headers.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `contact-messages-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportContactsPDF = async (
  rows: ContactExportRow[],
  fields: ContactExportField[],
  isRTL: boolean,
  meta: { totalCount: number; filterSummary: string },
) => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const fontLoaded = await setupArabicDoc(doc, isRTL);
  const pageWidth = doc.internal.pageSize.getWidth();
  const styles = getArabicTableStyles(isRTL, fontLoaded);

  doc.setFontSize(16);
  doc.text(isRTL ? 'تقرير رسائل التواصل' : 'Contact Messages Report', pageWidth / 2, 14, { align: 'center' });
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `qitaat.com — ${new Date().toLocaleString(isRTL ? 'ar-SA' : 'en-US')} — ${
      isRTL ? `${rows.length} من ${meta.totalCount}` : `${rows.length} of ${meta.totalCount}`
    }`,
    pageWidth / 2, 20, { align: 'center' },
  );
  if (meta.filterSummary) {
    doc.setFontSize(8);
    doc.text(meta.filterSummary, pageWidth / 2, 25, { align: 'center' });
  }

  const head = [fields.map(f => fieldLabel(f, isRTL))];
  const body = rows.map(r =>
    fields.map(f => {
      const v = (r as Record<string, unknown>)[f];
      const s = fmt(v);
      // Truncate long fields for table layout
      if (f === 'message' || f === 'ai_summary' || f === 'internal_notes') {
        return s.length > 140 ? s.slice(0, 137) + '…' : s;
      }
      return s;
    }),
  );

  autoTable(doc, {
    startY: 30,
    head,
    body,
    theme: 'grid',
    styles: { ...styles.styles, fontSize: 7, cellPadding: 1.5 },
    headStyles: { ...styles.headStyles, fontSize: 8 },
    didDrawPage: () => {
      const pageCount = doc.getNumberOfPages();
      const current = doc.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`${current} / ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 6, { align: 'center' });
    },
  });

  doc.save(`contact-messages-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.pdf`);
};

export const ALL_EXPORT_FIELDS: ContactExportField[] = [
  'ticket_number', 'name', 'email', 'subject', 'message',
  'status', 'priority', 'work_state', 'assigned_to_name', 'starred',
  'internal_notes', 'created_at', 'replied_at', 'response_hours',
  'ai_priority', 'ai_category', 'ai_summary',
];

export const DEFAULT_EXPORT_FIELDS: ContactExportField[] = [
  'ticket_number', 'name', 'email', 'subject', 'status',
  'priority', 'assigned_to_name', 'created_at', 'response_hours',
];