import { describe, it, vi } from 'vitest';
vi.mock('@/lib/pdf-arabic-font', () => ({
  ArabicPdfFontError: class extends Error {},
  registerArabicFont: async () => true,
  setupArabicDoc: async () => true,
  verifyArabicFontReady: () => true,
  getArabicTableStyles: () => ({}),
  normalizeArabicPdfTextLayer: () => {},
  printContractSection: () => {},
}));
import { buildContractPDF } from '@/lib/contract-pdf-export';
import { templatedContractFixture } from '@/test/fixtures/contract-pdf-fixtures';
describe('dump', () => {
  it('dumps', async () => {
    const doc = await buildContractPDF({ ...templatedContractFixture, isRTL: false });
    const t = (doc as any).output() as string;
    const fs = await import('node:fs');
    fs.writeFileSync('/tmp/pdfdump.txt', t);
  });
});
