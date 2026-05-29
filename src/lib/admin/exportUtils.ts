/**
 * Shared CSV + print utilities for admin pages.
 *
 * - downloadCsv: writes a UTF-8 BOM CSV to the user.
 * - printCurrentView: triggers the browser print dialog. Pages should
 *   add `print:hidden` to filters and `@media print` styles for layout.
 * - escapeCsvCell: RFC4180-style escaping for a single cell.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : (typeof value === 'object' ? JSON.stringify(value) : String(value));
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const bodyLines = rows.map((r) => r.map(escapeCsvCell).join(','));
  return [headerLine, ...bodyLines].join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printCurrentView(): void {
  if (typeof window !== 'undefined') {
    window.print();
  }
}

export function tsStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}