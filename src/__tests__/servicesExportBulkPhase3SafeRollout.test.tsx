import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readSrc(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

const SRC = readSrc('src/pages/dashboard/DashboardServices.tsx');

describe('SERVICES EXPORT + BULK ACTIONS PHASE 3 SAFE ROLLOUT', () => {
  it('1. Services page imports and uses the unified ExportMenu', () => {
    expect(SRC).toMatch(/from '@\/components\/dashboard\/ExportMenu'/);
    expect(SRC).toMatch(/<ExportMenu\b/);
  });

  it('2 & 11. Export columns contain no sensitive fields / no raw IDs', () => {
    const block = SRC.match(/serviceExportColumns[\s\S]+?\]\), \[/);
    expect(block, 'export columns block found').toBeTruthy();
    const s = block![0];
    for (const forbidden of [
      /key:\s*['"]id['"]/,
      /key:\s*['"]user_id['"]/,
      /key:\s*['"]business_id['"]/,
      /key:\s*['"]service_id['"]/,
      /key:\s*['"]source_sub_service_id['"]/,
      /key:\s*['"]email['"]/,
      /\btoken\b/i,
      /raw_metadata/i,
      /internal_notes/i,
      /file_url/i,
    ]) {
      expect(s, `must not include ${forbidden}`).not.toMatch(forbidden);
    }
  });

  it('3. PDF export is labeled as a services report, not invoice/quote/official', () => {
    expect(SRC).toMatch(/تقرير الخدمات/);
    expect(SRC).toMatch(/Services Report/);
    expect(SRC).not.toMatch(/Invoice|فاتورة|عرض سعر|Quote|Official|وثيقة رسمية/i);
  });

  it('4 & 10. Bulk selection UI only renders when there is a business AND services', () => {
    expect(SRC).toMatch(/\{!!businessId && \(\s*<div className="mb-3 flex items-center justify-between/);
    expect(SRC).toMatch(/\{!!businessId && displayList\.length > 0 && \(\s*<BulkActionBar/);
  });

  it('5. BulkActionBar is wired into the page', () => {
    expect(SRC).toMatch(/from '@\/components\/dashboard\/BulkActionBar'/);
    expect(SRC).toMatch(/<BulkActionBar\b/);
  });

  it('6, 7 & 8. Bulk actions contain no delete / publish / activate / price ops', () => {
    const bar = SRC.match(/<BulkActionBar[\s\S]+?\]\}\s*\/>/);
    expect(bar, 'BulkActionBar block found').toBeTruthy();
    const s = bar![0];
    for (const forbidden of [
      /delete/i,
      /trash/i,
      /activate/i,
      /deactivate/i,
      /publish/i,
      /unpublish/i,
      /hide/i,
      /pause/i,
      /price/i,
      /حذف/i,
      /تفعيل/i,
      /تعطيل/i,
      /نشر/i,
      /إخفاء/i,
      /سعر/,
      /quote/i,
      /invoice/i,
    ]) {
      expect(s, `bulk actions must not include ${forbidden}`).not.toMatch(forbidden);
    }
    expect(s).toMatch(/export-selected-csv/);
    expect(s).toMatch(/export-selected-pdf/);
  });

  it('9. Empty services does not fail — grid renders only when filteredDisplayList.length > 0', () => {
    expect(SRC).toMatch(/!loading && filteredDisplayList\.length > 0/);
    const bar = readSrc('src/components/dashboard/BulkActionBar.tsx');
    expect(bar).toMatch(/if \(count === 0\) return null/);
  });

  it('12. No hardcoded hex colors introduced in the new export/bulk block', () => {
    const block = SRC.match(/Phase 3 Safe Rollout[\s\S]+?bulkExportSelectedPdf[\s\S]+?\};\n/);
    expect(block, 'new export/bulk block found').toBeTruthy();
    expect(block![0]).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('13. No suppressions or any-casts in the new code', () => {
    const block = SRC.match(/Phase 3 Safe Rollout[\s\S]+?bulkExportSelectedPdf[\s\S]+?\};\n/);
    expect(block).toBeTruthy();
    const s = block![0];
    expect(s).not.toMatch(/@ts-ignore|@ts-expect-error|eslint-disable/);
    expect(s).not.toMatch(/\bas\s+any\b/);
    expect(s).not.toMatch(/:\s*any\b/);
  });

  it('Bonus. Create/edit/delete service mutations remain intact', () => {
    expect(SRC).toMatch(/upsertMut\s*=\s*useMutation/);
    expect(SRC).toMatch(/toggleMut\s*=\s*useMutation/);
    expect(SRC).toMatch(/removeSubMut\s*=\s*useMutation/);
    expect(SRC).toMatch(/addSubMut\s*=\s*useMutation/);
  });
});