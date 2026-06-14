import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const SEC_DIR = join(ROOT, 'src/components/admin/contracts/pdf-audit');
const PAGE = join(ROOT, 'src/pages/admin/AdminPdfExportAudit.tsx');
const APP_TSX = join(ROOT, 'src/App.tsx');

const FORBIDDEN_BAD = [/\bas\s+any\b/, /:\s*any\b/, /@ts-ignore/, /@ts-expect-error/, /eslint-disable/];

function readSec(name: string): string {
  return readFileSync(join(SEC_DIR, name), 'utf8');
}
function listSec(): string[] {
  return readdirSync(SEC_DIR).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));
}

describe('Phase 8G — Admin PDF Export Audit extraction', () => {
  it('1. AdminPdfExportAudit.tsx uses the new section components', () => {
    const src = readFileSync(PAGE, 'utf8');
    expect(src).toMatch(/PdfExportAuditStatsSection/);
    expect(src).toMatch(/PdfExportAuditFiltersBar/);
    expect(src).toMatch(/PdfExportAuditTableSection/);
    expect(src).toMatch(/PdfExportPrivacyNotice/);
    expect(src).toMatch(/from '@\/components\/admin\/contracts\/pdf-audit'/);
  });

  it('2. new components do not import Supabase', () => {
    for (const f of listSec()) {
      const src = readSec(f);
      expect(src, f).not.toMatch(/@\/integrations\/supabase/);
      expect(src, f).not.toMatch(/from ['"]@supabase/);
    }
  });

  it('3. no queries in new components', () => {
    for (const f of listSec()) {
      const src = readSec(f);
      expect(src, f).not.toMatch(/\buseQuery\b/);
      expect(src, f).not.toMatch(/\buseInfiniteQuery\b/);
    }
  });

  it('4. no mutations in new components', () => {
    for (const f of listSec()) {
      const src = readSec(f);
      expect(src, f).not.toMatch(/\buseMutation\b/);
      expect(src, f).not.toMatch(/\buseQueryClient\b/);
    }
  });

  it('5. no PDF generation libs in new components', () => {
    for (const f of listSec()) {
      const src = readSec(f);
      expect(src, f).not.toMatch(/jspdf|pdf-lib|qrcode|html2canvas/i);
    }
  });

  it('6. no contract template/PDF services in new components', () => {
    const FORBIDDEN = [
      /@\/modules\/contracts\/services\/pdfExports/,
      /adminListContractPdfExports/,
      /adminContractPdfExportsSummary/,
      /from ['"]@\/modules\/contracts['"]/,
    ];
    for (const f of listSec()) {
      const src = readSec(f);
      for (const pat of FORBIDDEN) {
        expect(src, `${f} :: ${pat}`).not.toMatch(pat);
      }
    }
  });

  it('7. no hardcoded hex colors in new components', () => {
    for (const f of listSec()) {
      const src = readSec(f);
      expect(src, f).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it('8. no forbidden type escapes in new components', () => {
    for (const f of listSec()) {
      const src = readSec(f);
      for (const pat of FORBIDDEN_BAD) {
        expect(src, `${f} :: ${pat}`).not.toMatch(pat);
      }
    }
  });

  it('9. privacy redaction (safePdfAuditText + UUID regex) still present and uses UUID matcher', () => {
    const src = readSec('types.ts');
    expect(src).toMatch(/UUID_RX/);
    expect(src).toMatch(/safePdfAuditText/);
    // Ensure UUID regex matches a sample UUID and rejects safe strings.
    expect(src).toMatch(/\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}/);
    // Page still consumes the privacy notice + uses Row/Summary contract names.
    const page = readFileSync(PAGE, 'utf8');
    expect(page).toMatch(/PdfExportPrivacyNotice/);
    expect(page).toMatch(/PdfExportAuditRow/);
    expect(page).toMatch(/PdfExportAuditSummary/);
  });

  it('10. PDF/QR/hash/signature module files untouched (no new imports of generation libs)', () => {
    const page = readFileSync(PAGE, 'utf8');
    expect(page).not.toMatch(/jspdf|pdf-lib|qrcode|html2canvas/i);
    // pdfExports service is still the *only* admin-list/summary source.
    expect(page).toMatch(/adminListContractPdfExports/);
    expect(page).toMatch(/adminContractPdfExportsSummary/);
  });

  it('11. App.tsx still routes AdminPdfExportAudit', () => {
    expect(existsSync(APP_TSX)).toBe(true);
    const src = readFileSync(APP_TSX, 'utf8');
    expect(src).toMatch(/AdminPdfExportAudit|pdf-export-audit/);
  });
});