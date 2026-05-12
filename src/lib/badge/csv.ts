/**
 * Client-side CSV export for badge analytics. Generates a Blob and triggers
 * a download — no backend, no popups (project UX rule).
 */

function escapeCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportRowsToCsv<T extends Record<string, unknown>>(
  rows: T[],
  filename: string,
): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escapeCell(r[h])).join(',')),
  ];
  // Prepend BOM so Excel opens UTF-8 (Arabic) correctly.
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
