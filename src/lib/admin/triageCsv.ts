/**
 * BUSINESS-ADMIN-6 — Client-side CSV export for Admin Bulk Reference Triage.
 *
 * Pure, no I/O at module scope. `downloadTriageCsv` is the only DOM-touching
 * helper and is invoked exclusively from the page's Export button.
 *
 * Safety: emits only sanitized columns already approved by the admin-safe
 * wrappers (ref_id, status, entity_type, label, item_status, priority,
 * open_notes_count, critical_notes_count, related_refs_count,
 * canonical_route). NEVER emits UUIDs, tokens, provider_intent_id, phone/
 * email, synthetic phone emails, or raw metadata.
 */
import type { AdminBulkTriageRow } from '@/modules/admin';

export const TRIAGE_CSV_COLUMNS = [
  'ref_id',
  'status',
  'entity_type',
  'label',
  'item_status',
  'priority',
  'open_notes_count',
  'critical_notes_count',
  'related_refs_count',
  'canonical_route',
] as const;

function escapeCsvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildTriageCsv(rows: AdminBulkTriageRow[]): string {
  const lines: string[] = [TRIAGE_CSV_COLUMNS.join(',')];
  for (const row of rows) {
    const sum = row.bundle?.summary ?? null;
    const related = row.bundle?.related_refs?.length ?? 0;
    const cells = [
      row.ref_id,
      row.status,
      sum?.entity_type ?? '',
      sum?.label ?? '',
      sum?.status ?? '',
      sum?.priority ?? '',
      row.openNotes,
      row.criticalNotes,
      related,
      sum?.canonical_route ?? '',
    ];
    lines.push(cells.map(escapeCsvCell).join(','));
  }
  return lines.join('\n');
}

export function triageCsvFilename(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `qitaat-triage-${y}-${m}-${d}.csv`;
}

export function downloadTriageCsv(rows: AdminBulkTriageRow[]): void {
  if (rows.length === 0) return;
  const csv = buildTriageCsv(rows);
  // Prepend BOM so Excel opens UTF-8 (Arabic labels) correctly.
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = triageCsvFilename();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}