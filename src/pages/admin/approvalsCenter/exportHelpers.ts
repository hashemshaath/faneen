/**
 * Pure helpers extracted from AdminApprovalsCenter so they can be unit-tested
 * and benchmarked without rendering the page. Used by:
 *  - the unified pending feed (CSV/PDF export)
 *  - the audit log (CSV/PDF export of admin decisions)
 *
 * Everything here is deterministic, side-effect free, and DOM-free.
 */

export interface ExportRow {
  category: string;
  ref_id: string;
  name: string;
  detail: string;
  created_at: string;
}

export interface AuditRow {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string | null;
  user_id?: string | null;
}

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function csvEscape(v: unknown): string {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

/** Build a UTF-8 CSV (with BOM so Excel reads Arabic correctly). */
export function buildCsv(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map((r) => r.map(csvEscape).join(',')),
  ];
  return '\uFEFF' + lines.join('\n');
}

export function buildApprovalsCsv(rows: ExportRow[], isRTL: boolean): string {
  const headers = isRTL
    ? ['النوع', 'المعرف', 'الاسم', 'التفاصيل', 'تاريخ الإنشاء']
    : ['Category', 'Ref ID', 'Name', 'Detail', 'Created At'];
  return buildCsv(
    headers,
    rows.map((r) => [r.category, r.ref_id, r.name, r.detail, r.created_at]),
  );
}

export function buildAuditCsv(rows: AuditRow[], isRTL: boolean): string {
  const headers = isRTL
    ? ['الإجراء', 'نوع الكيان', 'معرف الكيان', 'المستخدم', 'تاريخ القرار']
    : ['Action', 'Entity Type', 'Entity ID', 'User', 'Decision At'];
  return buildCsv(
    headers,
    rows.map((r) => [
      r.action,
      r.entity_type ?? '',
      r.entity_id ?? '',
      r.user_id ?? '',
      r.created_at ?? '',
    ]),
  );
}

export interface PdfTableOptions {
  title: string;
  isRTL: boolean;
  headers: string[];
  rows: string[][];
  meta?: string;
}

/** Build a self-contained printable HTML document for window.print()-based PDF. */
export function buildPdfHtml(opts: PdfTableOptions): string {
  const { title, isRTL, headers, rows, meta } = opts;
  const rowsHtml = rows.map((r) =>
    `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`,
  ).join('');
  return `<!doctype html><html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${isRTL ? 'ar' : 'en'}"><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title>
    <style>
      body { font-family: -apple-system, "Segoe UI", Tahoma, sans-serif; padding: 24px; color: #111; }
      h1 { font-size: 18px; margin: 0 0 4px; }
      .meta { font-size: 11px; color: #555; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: ${isRTL ? 'right' : 'left'}; }
      th { background: #f3f4f6; }
      tr:nth-child(even) td { background: #fafafa; }
      @media print { body { padding: 0; } }
    </style></head><body>
    <h1>${escapeHtml(title)}</h1>
    ${meta ? `<div class="meta">${escapeHtml(meta)}</div>` : ''}
    <table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody></table>
    <script>window.onload = () => { window.print(); };</script>
    </body></html>`;
}

export type DateRangeKey = 'all' | '24h' | '7d' | '30d';

const RANGE_MS: Record<DateRangeKey, number | null> = {
  all: null,
  '24h': 24 * 3600_000,
  '7d': 7 * 24 * 3600_000,
  '30d': 30 * 24 * 3600_000,
};

/** Filter audit rows by free-text search + date range. Pure & memoizable. */
export function filterAuditRows(
  rows: AuditRow[],
  search: string,
  dateRange: DateRangeKey,
  now: number = Date.now(),
): AuditRow[] {
  const q = search.trim().toLowerCase();
  const cutoff = RANGE_MS[dateRange];
  return rows.filter((r) => {
    if (cutoff !== null) {
      const t = r.created_at ? new Date(r.created_at).getTime() : 0;
      if (!t || now - t > cutoff) return false;
    }
    if (!q) return true;
    return (
      r.action.toLowerCase().includes(q) ||
      (r.entity_type ?? '').toLowerCase().includes(q) ||
      (r.entity_id ?? '').toLowerCase().includes(q)
    );
  });
}

/** Trigger a browser download for a text blob. Safe no-op outside DOM. */
export function downloadTextFile(content: string, filename: string, mime = 'text/csv;charset=utf-8;') {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}