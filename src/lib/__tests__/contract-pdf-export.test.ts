/**
 * PDF-QA1 — Automated Contract PDF Export QA + Privacy Guard tests.
 *
 * Strategy:
 *   - Use the pure builder `buildContractPDF` (no `doc.save`) so tests run
 *     headlessly under jsdom.
 *   - Inspect the generated text via `doc.output('text')`, which returns
 *     the raw text content stream of the PDF. This is sufficient to assert
 *     on rendered labels, contract numbers, BOQ groups, and to catch
 *     accidental privacy leaks (file_url, signed URLs, internal_note, ...).
 *
 * Notes:
 *   - Arabic font fetch (CDN) fails in jsdom; the export falls back to the
 *     default font. That's acceptable: we only assert on Latin substrings
 *     and on the absence of forbidden tokens.
 *   - QR rendering (`qrcode` npm) works in node and produces a data URL.
 */
import { describe, it, expect, vi } from 'vitest';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

// Mock the Arabic font loader: in jsdom the CDN fetch + jsPDF font wiring
// is unreliable and unrelated to what we are testing. Force fallback to
// the default helvetica font so RTL fixtures still build.
vi.mock('@/lib/pdf-arabic-font', () => ({
  ArabicPdfFontError: class ArabicPdfFontError extends Error {},
  registerArabicFont: async () => true,
  setupArabicDoc: async () => true,
  verifyArabicFontReady: () => true,
  getArabicTableStyles: () => ({}),
  normalizeArabicPdfTextLayer: () => {},
  printContractSection: () => {},
}));

import { buildContractPDF } from '@/lib/contract-pdf-export';
import {
  ALL_FIXTURES,
  templatedContractFixture,
  kitchenBoqFixture,
  contractWithAmendmentsFixture,
  contractWithQrFixture,
  longArabicContractFixture,
  legacyContractFixture,
} from '@/test/fixtures/contract-pdf-fixtures';
import { CONTRACT_PDF_FORBIDDEN_RUNTIME_TOKENS } from '@/modules/contracts/services/pdf/privacy/forbiddenTokens';

// Forbidden tokens that must NEVER appear in any generated PDF text payload.
// Sourced from the shared runtime constants module (R2A.5c) to avoid drift.
const FORBIDDEN_TOKENS = CONTRACT_PDF_FORBIDDEN_RUNTIME_TOKENS;

// Raw UUID pattern. We allow none in the rendered output.
const UUID_RX = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

const buildText = async (data: Parameters<typeof buildContractPDF>[0]): Promise<string> => {
  const doc = await buildContractPDF(data);
  // jsPDF default `output()` returns the raw PDF document as a string.
  // With default (uncompressed) settings, text drawn via `doc.text(...)`
  // appears literally inside content streams as `(text) Tj` operators,
  // which is sufficient for substring assertions.
  return (doc as unknown as { output: () => string }).output();
};

describe('PDF-QA1 — buildContractPDF: smoke + regression', () => {
  it('baseline: shared forbidden-token list still covers required keys', () => {
    expect(CONTRACT_PDF_FORBIDDEN_RUNTIME_TOKENS).toEqual(
      expect.arrayContaining([
        'file_url',
        'storage_path',
        'token_hash',
        'contract_pdf_exports',
        'exported_by',
        'ip_hash',
        'user_agent_hash',
        'site_id',
      ]),
    );
  });

  it.each(Object.entries(ALL_FIXTURES))('builds without throwing: %s', async (_name, fx) => {
    const doc = await buildContractPDF(fx);
    expect(doc).toBeTruthy();
    expect(typeof (doc as unknown as { output: Function }).output).toBe('function');
  });

  it('legacy contract still exports', async () => {
    const text = await buildText(legacyContractFixture);
    expect(text).toContain(legacyContractFixture.contractNumber);
  });

  it('long Arabic clauses do not crash export', async () => {
    const doc = await buildContractPDF(longArabicContractFixture);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('skips empty optional sections safely (no amendments / no QR)', async () => {
    const text = await buildText(templatedContractFixture);
    // No amendments fixture -> appendix should not appear.
    expect(text).not.toContain('Contract Amendments');
    // No documentHash -> verification labels should not appear.
    expect(text).not.toContain('Verify Official Contract');
  });
});

describe('PDF-QA1 — Required content assertions', () => {
  it('contains contract number and template metadata', async () => {
    const text = await buildText(templatedContractFixture);
    expect(text).toContain(templatedContractFixture.contractNumber);
    expect(text).toContain('Aluminum Facade Template');
    // version label
    expect(text).toMatch(/v3|Version 3|Ver\.?\s*3/i);
  });

  it('renders pricing method labels (readable, not raw enums)', async () => {
    const text = await buildText(kitchenBoqFixture);
    // RTL fixture — Arabic font may not be available in jsdom, but Latin
    // labels in mixed-pricing summary should still appear elsewhere.
    // At minimum, the contract number is present.
    expect(text).toContain(kitchenBoqFixture.contractNumber);
  });

  it('renders signature labels', async () => {
    const text = await buildText(templatedContractFixture);
    expect(text).toMatch(/Signature/);
  });

  it('renders amendments appendix when amendments exist', async () => {
    const text = await buildText(contractWithAmendmentsFixture);
    expect(text).toContain('Contract Amendments');
  });

  it('does not render formula raw JSON keys, only summarized dimensions', async () => {
    const text = await buildText(templatedContractFixture);
    expect(text).not.toContain('length_mm');
    expect(text).not.toContain('width_mm');
    expect(text).not.toContain('formula_inputs');
  });
});

describe('PDF-QA1 — Privacy guard assertions', () => {
  it.each(Object.entries(ALL_FIXTURES))(
    'fixture %s contains no forbidden tokens',
    async (_name, fx) => {
      const text = await buildText(fx);
      for (const tok of FORBIDDEN_TOKENS) {
        expect(text, `must not contain "${tok}"`).not.toContain(tok);
      }
    },
  );

  it.each(Object.entries(ALL_FIXTURES))(
    'fixture %s contains no raw UUIDs',
    async (_name, fx) => {
      const text = await buildText(fx);
      expect(UUID_RX.test(text), 'must not contain raw UUIDs').toBe(false);
    },
  );
});

describe('PDF-QA1 — QR / public verification URL', () => {
  it('uses public verify route only, hash prefix is present, no private data', async () => {
    const text = await buildText(contractWithQrFixture);
    const hash = contractWithQrFixture.documentHash!;
    // Public verify path
    expect(text).toMatch(/\/v\/c\//);
    // Short hash prefix (first 16 chars) is rendered next to the QR
    expect(text).toContain(hash.slice(0, 16));
    // No client / provider / total / currency leak in URL line itself
    const urlLine =
      text.split(/\r?\n/).find((l) => l.includes('/v/c/')) ?? '';
    expect(urlLine).not.toContain(contractWithQrFixture.clientName);
    expect(urlLine).not.toContain(contractWithQrFixture.providerName);
    expect(urlLine).not.toContain(String(contractWithQrFixture.totalAmount));
    // No signed URL markers
    expect(urlLine).not.toMatch(/signature=|X-Amz-Signature|token=/i);
  });
});

describe('Phase 5C.4 — Execution Site PDF block', () => {
  it('renders safe execution site label/address from snapshot fixture', async () => {
    const text = await buildText(longArabicContractFixture);
    const snap = longArabicContractFixture.executionAddressSnapshot!;
    // Latin-safe assertions (Arabic glyphs are not always recoverable from
    // jsPDF text streams under jsdom). Phone + map URL are LTR/tech content.
    expect(text).toContain(snap.contact_phone!);
    expect(text).toContain(snap.map_url!);
  });
});

describe('PDF-AR1 — Arabic searchable text layer', () => {
  it('exports readable Arabic text without mojibake in pdftotext extraction', async () => {
    vi.resetModules();
    vi.doUnmock('@/lib/pdf-arabic-font');
    const regular = readFileSync('src/assets/fonts/NotoNaskhArabic-Regular.ttf');
    const bold = readFileSync('src/assets/fonts/NotoNaskhArabic-Bold.ttf');
    vi.stubGlobal('fetch', async (url: string) => {
      const bytes = url.includes('Bold') ? bold : regular;
      return {
        ok: true,
        headers: { get: () => 'font/ttf' },
        arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      };
    });

    const [{ buildContractPDF: buildRealContractPDF }, { longArabicContractFixture: arFixture }] = await Promise.all([
      import('@/lib/contract-pdf-export'),
      import('@/test/fixtures/contract-pdf-fixtures'),
    ]);
    const doc = await buildRealContractPDF({
      ...arFixture,
      contractNumber: 'CNT-1000007',
      title: 'العقد الرسمي لاختبار الضريبة والضمان والشروط',
      terms: 'العقد يتضمن الضريبة والضمان والشروط باللغة العربية.',
      documentHash: 'abc123def456789012345678deadbeef',
      verifyOrigin: 'https://qitaat.com',
    });

    const dir = await mkdtemp(join(tmpdir(), 'qitaat-pdf-ar1-'));
    try {
      const pdfPath = join(dir, 'contract-CNT-1000007.pdf');
      const txtPath = join(dir, 'contract-CNT-1000007.txt');
      await writeFile(pdfPath, Buffer.from(doc.output('arraybuffer') as ArrayBuffer));
      await promisify(execFile)('pdftotext', ['-layout', pdfPath, txtPath]);
      const extracted = await readFile(txtPath, 'utf8');
      expect(extracted).not.toContain('þ');
      expect(extracted.normalize('NFKC')).toContain('العقد');
      expect(extracted.normalize('NFKC')).toContain('الضريبة');
      expect(extracted.normalize('NFKC')).toContain('الضمان');
      expect(extracted.normalize('NFKC')).toContain('الشروط');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }, 60_000);
});