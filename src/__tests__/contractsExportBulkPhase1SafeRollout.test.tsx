import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readSrc(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

const SRC = readSrc('src/pages/dashboard/DashboardContracts.tsx');

describe('CONTRACTS EXPORT + BULK ACTIONS PHASE 1 SAFE ROLLOUT', () => {
  it('1. Contracts page imports + uses the unified ExportMenu', () => {
    expect(SRC).toMatch(/from '@\/components\/dashboard\/ExportMenu'/);
    expect(SRC).toMatch(/<ExportMenu\b/);
  });

  it('2. CSV/PDF column set contains no sensitive fields', () => {
    const block = SRC.match(/contractExportColumns[\s\S]+?\]\), \[/);
    expect(block, 'export columns block found').toBeTruthy();
    const s = block![0];
    for (const forbidden of [
      /key:\s*['"]user_id['"]/,
      /key:\s*['"]business_id['"]/,
      /key:\s*['"]provider_id['"]/,
      /key:\s*['"]client_id['"]/,
      /document_hash/i,
      /canonical_snapshot/i,
      /signature/i,
      /national_id/i,
      /\btoken\b/i,
      /key:\s*['"]email['"]/,
      /raw_metadata/i,
    ]) {
      expect(s, `must not include ${forbidden}`).not.toMatch(forbidden);
    }
  });

  it('3. PDF export is labeled as a report, not an official contract copy', () => {
    // The ExportMenu title is wired to "تقرير العقود" / "Contracts Report"
    expect(SRC).toMatch(/تقرير العقود/);
    expect(SRC).toMatch(/Contracts Report/);
    // The list-level PDF helper also titles itself "Contracts Report"
    const reportTitleHits = SRC.match(/Contracts Report/g) ?? [];
    expect(reportTitleHits.length).toBeGreaterThanOrEqual(1);
    // Never call it an official contract / signed copy in the export wiring
    const exportBlock = SRC.match(/ExportMenu[\s\S]+?\/>/);
    expect(exportBlock).toBeTruthy();
    expect(exportBlock![0]).not.toMatch(/Official Contract|نسخة عقد|Signed Copy/i);
  });

  it('4. Multi-select toolbar only renders when contracts exist', () => {
    // The "Select page" button + ExportMenu are guarded by filtered.length > 0
    expect(SRC).toMatch(/\{filtered\.length > 0 && \(\s*<div className="flex flex-wrap items-center gap-2 px-1">/);
    expect(SRC).toMatch(/Select page|تحديد عقود الصفحة/);
  });

  it('5. BulkActionBar is wired and rendered only inside list view', () => {
    expect(SRC).toMatch(/<BulkActionBar/);
    expect(SRC).toMatch(/viewSection === 'list' && \(\s*<BulkActionBar/);
  });

  it('6-9. Bulk actions contain no signing / approval / status / official PDF operations', () => {
    // Extract the BulkActionBar actions array
    const bar = SRC.match(/<BulkActionBar[\s\S]+?\/>/);
    expect(bar).toBeTruthy();
    const s = bar![0];
    for (const forbidden of [
      /sign/i,
      /approve/i,
      /accept/i,
      /send.?for.?approval/i,
      /status/i,
      /lifecycle/i,
      /official/i,
      /generatePdf|contract.?pdf|نسخة عقد|توقيع|قبول|إرسال للموافقة|تغيير الحالة/i,
    ]) {
      expect(s, `bulk actions must not include ${forbidden}`).not.toMatch(forbidden);
    }
    // Only safe action allowed
    expect(s).toMatch(/export-selected/);
  });

  it('10. Empty contracts does not break the toolbar (gated by filtered.length > 0)', () => {
    // BulkActionBar early-returns on count===0 (foundation-level guarantee)
    const bar = readSrc('src/components/dashboard/BulkActionBar.tsx');
    expect(bar).toMatch(/if \(count === 0\) return null/);
    // Toolbar gated
    expect(SRC).toMatch(/\{filtered\.length > 0 &&/);
  });

  it('11. No hardcoded hex colors in the new contracts toolbar code', () => {
    // Only scan the new block we added (between contractExportColumns and the end of the bulkExportSelected callback).
    const block = SRC.match(/contractExportColumns[\s\S]+?bulkExportSelected[\s\S]+?\}, \[selectedContractRows[\s\S]+?\]\);/);
    expect(block).toBeTruthy();
    expect(block![0]).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    // Also scan the BulkActionBar wiring block
    const barBlock = SRC.match(/viewSection === 'list' && \(\s*<BulkActionBar[\s\S]+?\)\}/);
    expect(barBlock).toBeTruthy();
    expect(barBlock![0]).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('12. No suppressions or any-casts introduced in the new contracts code', () => {
    // Scan the export-columns + bulk wiring + new toolbar block
    const block = SRC.match(/contractExportColumns[\s\S]+?bulkExportSelected[\s\S]+?\}, \[selectedContractRows[\s\S]+?\]\);/);
    expect(block).toBeTruthy();
    const s = block![0];
    expect(s).not.toMatch(/@ts-ignore|@ts-expect-error|eslint-disable/);
    expect(s).not.toMatch(/\bas\s+any\b/);
    expect(s).not.toMatch(/:\s*any\b/);
  });
});
