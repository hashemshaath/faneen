/**
 * Framework-free CSV builders for the unified Admin Reports Center.
 * Pure functions so they're unit-testable and reusable across reports.
 */

export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value).replace(/[\r\n]+/g, ' ').replace(/"/g, '""').trim();
  return s.includes(',') || s.includes('"') ? `"${s}"` : s;
}

export function buildCsv<T extends Record<string, unknown>>(
  rows: T[],
  headers: ReadonlyArray<keyof T & string>,
): string {
  const head = headers.join(',');
  const body = rows
    .map((r) => headers.map((h) => sanitizeCsvCell(r[h])).join(','))
    .join('\n');
  // UTF-8 BOM for Arabic Excel compatibility
  return '\uFEFF' + head + '\n' + body;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface DateRange {
  from: string; // ISO date YYYY-MM-DD
  to: string;
}

export function defaultRange(days = 30): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}