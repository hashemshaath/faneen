import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readSrc(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

const SRC = readSrc('src/pages/dashboard/DashboardProjects.tsx');

describe('PROJECTS EXPORT + BULK ACTIONS PHASE 2 SAFE ROLLOUT', () => {
  it('1. Projects page imports and uses the unified ExportMenu', () => {
    expect(SRC).toMatch(/from '@\/components\/dashboard\/ExportMenu'/);
    expect(SRC).toMatch(/<ExportMenu\b/);
  });

  it('2 & 11. Export columns contain no sensitive fields (no user_id/business_id/client_id/site_id raw IDs)', () => {
    const block = SRC.match(/projectExportColumns[\s\S]+?\]\), \[/);
    expect(block, 'export columns block found').toBeTruthy();
    const s = block![0];
    for (const forbidden of [
      /key:\s*['"]user_id['"]/,
      /key:\s*['"]business_id['"]/,
      /key:\s*['"]client_id['"]/,
      /key:\s*['"]site_id['"]/,
      /key:\s*['"]id['"]/,
      /key:\s*['"]cover_image_url['"]/,
      /\btoken\b/i,
      /raw_metadata/i,
      /internal_notes/i,
      /key:\s*['"]email['"]/,
    ]) {
      expect(s, `must not include ${forbidden}`).not.toMatch(forbidden);
    }
  });

  it('3. PDF export is labeled as a projects report, not an official document', () => {
    expect(SRC).toMatch(/تقرير المشاريع/);
    expect(SRC).toMatch(/Projects Report/);
    const exportBlock = SRC.match(/<ExportMenu[\s\S]+?\/>/);
    expect(exportBlock).toBeTruthy();
    expect(exportBlock![0]).not.toMatch(/Official|نسخة عقد|Signed|Invoice|فاتورة/i);
  });

  it('4. ExportMenu and BulkActionBar render only when projects exist', () => {
    // ExportMenu is gated by projects.length > 0
    expect(SRC).toMatch(/\{projects\.length > 0 && \(\s*<ExportMenu/);
    // BulkActionBar is gated by businessId AND projects.length > 0
    expect(SRC).toMatch(/\{!!businessId && projects\.length > 0 && \(\s*<BulkActionBar/);
  });

  it('5. BulkActionBar is wired into the page', () => {
    expect(SRC).toMatch(/from '@\/components\/dashboard\/BulkActionBar'/);
    expect(SRC).toMatch(/<BulkActionBar\b/);
  });

  it('6, 7 & 8. Bulk actions contain no delete / status / send / convert / invoice operations', () => {
    const bar = SRC.match(/<BulkActionBar[\s\S]+?\]\}\s*\/>/);
    expect(bar, 'BulkActionBar block found').toBeTruthy();
    const s = bar![0];
    for (const forbidden of [
      /delete/i,
      /trash/i,
      /status/i,
      /publish/i,
      /draft/i,
      /send/i,
      /convert/i,
      /invoice/i,
      /فاتورة/i,
      /حذف/i,
      /تحويل/i,
      /إرسال/i,
      /نشر/i,
      /workflow/i,
    ]) {
      expect(s, `bulk actions must not include ${forbidden}`).not.toMatch(forbidden);
    }
    // Only safe export ids allowed
    expect(s).toMatch(/export-selected-csv/);
    expect(s).toMatch(/export-selected-pdf/);
  });

  it('9 & 10. Empty / no-entity states do not render bulk actions', () => {
    // The BulkActionBar gating excludes the no-entity case
    expect(SRC).toMatch(/\{!!businessId && projects\.length > 0 && \(\s*<BulkActionBar/);
    // Foundation guarantee: BulkActionBar early-returns on count===0
    const bar = readSrc('src/components/dashboard/BulkActionBar.tsx');
    expect(bar).toMatch(/if \(count === 0\) return null/);
  });

  it('12. No hardcoded hex colors introduced by the new export/bulk code', () => {
    const block = SRC.match(/projectExportColumns[\s\S]+?bulkExportSelectedPdf[\s\S]+?\}, \[selectedProjectRows[\s\S]+?\]\);/);
    expect(block, 'new export/bulk block found').toBeTruthy();
    expect(block![0]).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    const bar = SRC.match(/\{!!businessId && projects\.length > 0 && \(\s*<BulkActionBar[\s\S]+?\)\}/);
    expect(bar).toBeTruthy();
    expect(bar![0]).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('13. No suppressions or any-casts in the new code', () => {
    const block = SRC.match(/projectExportColumns[\s\S]+?bulkExportSelectedPdf[\s\S]+?\}, \[selectedProjectRows[\s\S]+?\]\);/);
    expect(block).toBeTruthy();
    const s = block![0];
    expect(s).not.toMatch(/@ts-ignore|@ts-expect-error|eslint-disable/);
    expect(s).not.toMatch(/\bas\s+any\b/);
    expect(s).not.toMatch(/:\s*any\b/);
  });

  it('Bonus. site_id behaviour preserved (still read in form, not in export)', () => {
    expect(SRC).toMatch(/site_id: form\.site_id \|\| null/);
    expect(SRC).toMatch(/site_id: p\.site_id \|\| ''/);
    const block = SRC.match(/projectExportColumns[\s\S]+?\]\), \[/);
    expect(block![0]).not.toMatch(/site_id/);
  });
});
