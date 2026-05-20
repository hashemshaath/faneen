/**
 * Barcode Phase 7/8 — Identifier section + /q/<code> QR path tests.
 */
import { describe, it, expect, vi } from 'vitest';

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
import { contractWithBarcodeFixture, contractWithQrFixture } from '@/test/fixtures/contract-pdf-fixtures';

const renderText = async (fx: Parameters<typeof buildContractPDF>[0]) => {
  const doc = await buildContractPDF(fx);
  return (doc as unknown as { output: () => string }).output();
};

describe('Barcode Phase 7 — PDF identifiers + QR path', () => {
  it('QR target uses /q/<contract_barcode_code> when barcode present', async () => {
    const text = await renderText(contractWithBarcodeFixture);
    expect(text).toContain('/q/CNT-2026-100007');
    expect(text).not.toContain('/v/c/CT-BC-0007');
  });

  it('identifiers section renders contract + project codes (mono cells)', async () => {
    const text = await renderText(contractWithBarcodeFixture);
    expect(text).toContain('CNT-2026-100007');
    expect(text).toContain('LOC-2026-100007');
    // QR sub-line label
    expect(text).toContain('Contract code:');
  });

  it('falls back to /v/c/<number>?h=<hash> when no barcode is present', async () => {
    const text = await renderText(contractWithQrFixture);
    expect(text).toContain('/v/c/');
    expect(text).not.toContain('/q/');
  });

  it('does not leak token hashes, raw tokens, or signed URLs', async () => {
    const text = await renderText(contractWithBarcodeFixture);
    for (const tok of ['qr_token_hash', 'current_scan_token_hash', 'token=', '/s/', 'X-Amz-Signature']) {
      expect(text, `must not contain "${tok}"`).not.toContain(tok);
    }
  });
});