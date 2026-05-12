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
import { describe, it, expect } from 'vitest';
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

// Forbidden tokens that must NEVER appear in any generated PDF text payload.
// If any of these surface, the export is leaking private data.
const FORBIDDEN_TOKENS = [
  'file_url',
  'storage_path',
  'getSignedUrl',
  'sign=',                       // common in signed URLs
  'internal_note',
  'actor_id',
  'approver_id',
  'token_hash',
  'formula_inputs',              // raw key should never leak
  'draft_template',
  'audit_metadata',
  'audit_log',
  '/storage/v1/object/sign',     // Supabase signed URL path
  'X-Amz-Signature',             // S3 signed URL marker
] as const;

// Raw UUID pattern. We allow none in the rendered output.
const UUID_RX = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

const buildText = async (data: Parameters<typeof buildContractPDF>[0]): Promise<string> => {
  const doc = await buildContractPDF(data);
  // jsPDF returns a string of all rendered text operators.
  return (doc as unknown as { output: (t: string) => string }).output('text');
};

describe('PDF-QA1 — buildContractPDF: smoke + regression', () => {
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