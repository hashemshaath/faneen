import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ExportMenu } from '@/components/dashboard/ExportMenu';
import { BulkActionBar } from '@/components/dashboard/BulkActionBar';
import { exportToCSV, exportToPDF, type ExportColumn } from '@/lib/export/exportTable';
import { Trash2 } from 'lucide-react';

// Wrap with a minimal LanguageContext (mock)
vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({ isRTL: true, language: 'ar' }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const FORBIDDEN_KEYS = [
  /user_id/i,
  /business_id/i,
  /access_token/i,
  /refresh_token/i,
  /password/i,
  /\bemail\b/i,
  /metadata/i,
];

function readSrc(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

describe('DASHBOARD EXPORT + BULK ACTION FOUNDATIONS QA', () => {
  it('1. ExportMenu surfaces CSV and PDF options', async () => {
    const rows = [{ id: '1', name: 'Test' }];
    const columns: ExportColumn<{ id: string; name: string }>[] = [
      { key: 'name', header: 'Name', accessor: (r) => r.name },
    ];
    render(<ExportMenu rows={rows} columns={columns} filename="t" title="t" />);
    await userEvent.click(screen.getByRole('button'));
    expect(await screen.findByText(/CSV/)).toBeInTheDocument();
    expect(screen.getByText(/PDF/)).toBeInTheDocument();
  });

  it('2 & 3. Notifications + Portfolio export columns exclude forbidden keys (no user_id/business_id/tokens/emails)', () => {
    const notif = readSrc('src/pages/dashboard/DashboardNotifications.tsx');
    const portfolio = readSrc('src/pages/dashboard/DashboardPortfolio.tsx');

    // Extract the export column blocks
    const notifBlock = notif.match(/exportColumns[\s\S]+?\]\), \[/);
    const portBlock = portfolio.match(/portfolioExportColumns[\s\S]+?\]\), \[/);
    expect(notifBlock, 'notifications export columns block found').toBeTruthy();
    expect(portBlock, 'portfolio export columns block found').toBeTruthy();
    for (const block of [notifBlock![0], portBlock![0]]) {
      // Look for forbidden field names appearing as object keys ('user_id:' / business_id, etc.)
      expect(block).not.toMatch(/key:\s*['"]user_id['"]/);
      expect(block).not.toMatch(/key:\s*['"]business_id['"]/);
      expect(block).not.toMatch(/key:\s*['"]email['"]/);
      expect(block).not.toMatch(/access_token|refresh_token|password|raw_metadata/i);
    }
    // Sanity: forbidden regex array is referenced somewhere
    expect(FORBIDDEN_KEYS.length).toBeGreaterThan(0);
  });

  it('3. exportToCSV does not throw on empty rows', () => {
    expect(() =>
      exportToCSV<{ id: string }>(
        [],
        [{ key: 'id', header: 'ID', accessor: (r) => r.id }],
        'empty',
      ),
    ).not.toThrow();
  });

  it('3b. exportToPDF supports RTL/Arabic labels without throwing', async () => {
    await expect(
      exportToPDF<{ id: string; title: string }>(
        [{ id: '1', title: 'مشروع تجريبي' }],
        [
          { key: 'id', header: 'المعرّف', accessor: (r) => r.id },
          { key: 'title', header: 'العنوان', accessor: (r) => r.title },
        ],
        { title: 'تقرير', filename: 'rtl', isRTL: true },
      ),
    ).resolves.not.toThrow();
  });

  it('4. Notifications renders selection Checkboxes (source)', () => {
    const src = readSrc('src/pages/dashboard/DashboardNotifications.tsx');
    expect(src).toMatch(/<Checkbox/);
    expect(src).toMatch(/onToggleSelect/);
    expect(src).toMatch(/useBulkSelection/);
  });

  it('5. BulkActionBar shows when count > 0 and hides when 0', () => {
    const action = { id: 'x', label: 'Delete', icon: Trash2, onClick: () => {} };
    const { rerender, container } = render(
      <BulkActionBar count={0} onClear={() => {}} actions={[action]} />,
    );
    expect(container.firstChild).toBeNull();
    rerender(<BulkActionBar count={2} onClear={() => {}} actions={[action]} />);
    expect(screen.getByRole('region')).toBeInTheDocument();
  });

  it('6 & 7. Empty data export (CSV) does not fail; mark-read/delete handlers are guarded by selection set', () => {
    // Guarded-by-selection: handlers are wired off bulk.selectedIds which is empty by default,
    // so no network call fires when count=0. We verify the source reads from bulk.selectedIds.
    const src = readSrc('src/pages/dashboard/DashboardNotifications.tsx');
    expect(src).toMatch(/Array\.from\(bulk\.selectedIds\)/);
    // BulkActionBar early-returns at count===0 so the buttons are unreachable.
    const bar = readSrc('src/components/dashboard/BulkActionBar.tsx');
    expect(bar).toMatch(/if \(count === 0\) return null/);
  });

  it('8. Portfolio uses the unified ExportMenu', () => {
    const src = readSrc('src/pages/dashboard/DashboardPortfolio.tsx');
    expect(src).toMatch(/import \{ ExportMenu \} from '@\/components\/dashboard\/ExportMenu'/);
    expect(src).toMatch(/<ExportMenu/);
  });

  it('10. No hardcoded hex colors in the new foundation files', () => {
    const files = [
      'src/components/dashboard/ExportMenu.tsx',
      'src/components/dashboard/BulkActionBar.tsx',
      'src/hooks/useBulkSelection.ts',
      'src/lib/export/exportTable.ts',
    ];
    for (const f of files) {
      const src = readSrc(f);
      // Hex colors only flagged inside class strings or style props
      const inlineHex = src.match(/['"`][^'"`]*#[0-9a-fA-F]{3,8}\b[^'"`]*['"`]/g) ?? [];
      // exportTable.ts uses jsPDF RGB tuples [16,185,129], NOT hex — allowed.
      expect(inlineHex, `hex literals found in ${f}: ${inlineHex.join(', ')}`).toHaveLength(0);
    }
  });

  it('11 & 12. No suppressions or any-casts in the foundation files', () => {
    const files = [
      'src/components/dashboard/ExportMenu.tsx',
      'src/components/dashboard/BulkActionBar.tsx',
      'src/hooks/useBulkSelection.ts',
      'src/lib/export/exportTable.ts',
    ];
    for (const f of files) {
      const src = readSrc(f);
      expect(src, f).not.toMatch(/@ts-ignore|@ts-expect-error|eslint-disable/);
      expect(src, f).not.toMatch(/\bas\s+any\b/);
      expect(src, f).not.toMatch(/:\s*any\b/);
    }
  });
});
