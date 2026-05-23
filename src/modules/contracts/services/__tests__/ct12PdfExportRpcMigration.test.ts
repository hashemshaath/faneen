import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const repoRoot = path.resolve(__dirname, '../../../../..');

function rg(pattern: string, extra: string[] = []): string[] {
  try {
    const out = execFileSync(
      'rg',
      ['-n', '--no-heading', pattern, 'src/', ...extra],
      { cwd: repoRoot, encoding: 'utf8' },
    );
    return out.trim().split('\n').filter(Boolean);
  } catch (e: unknown) {
    const err = e as { status?: number; stderr?: Buffer };
    if (err.status === 1) return [];
    throw new Error(`rg failed: ${err.stderr?.toString() ?? String(e)}`);
  }
}

describe('CT-12 PDF export RPC migration guard', () => {
  it('src/lib/contract-pdf-history.ts no longer calls supabase.rpc directly', () => {
    const src = fs.readFileSync(
      path.resolve(repoRoot, 'src/lib/contract-pdf-history.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/supabase\.rpc\(/);
    expect(src).toContain('recordContractPdfExportRpc');
  });

  it('no app/lib code calls record_contract_pdf_export via supabase.rpc outside services', () => {
    const hits = rg(
      `supabase\\.rpc\\(['"]record_contract_pdf_export['"]`,
      ['--glob', '!**/__tests__/**', '--glob', '!src/modules/contracts/services/**'],
    );
    expect(hits).toEqual([]);
  });

  it('no app/lib code calls PDF export listing RPCs outside services', () => {
    const names = [
      'list_contract_pdf_exports',
      'admin_list_contract_pdf_exports',
      'admin_contract_pdf_exports_summary',
    ];
    for (const n of names) {
      const hits = rg(
        `supabase\\.rpc\\(['"]${n}['"]`,
        ['--glob', '!**/__tests__/**', '--glob', '!src/modules/contracts/services/**'],
      );
      expect(hits, `${n} should only be invoked from services`).toEqual([]);
    }
  });
});
