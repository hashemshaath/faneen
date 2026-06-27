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
import { templatedContractFixture } from '@/test/fixtures/contract-pdf-fixtures';

const buildText = async (data: Parameters<typeof buildContractPDF>[0]) => {
  const doc = await buildContractPDF({ ...data, isRTL: false });
  return (doc as unknown as { output: () => string }).output();
};

describe('Contract PDF — party terminology', () => {
  it('labels provider as First Party — Service Provider', async () => {
    const text = await buildText(templatedContractFixture);
    expect(text).toContain('First Party');
    expect(text).toContain('Service Provider');
  });

  it('labels account holder as Second Party — Account Holder', async () => {
    const text = await buildText(templatedContractFixture);
    expect(text).toContain('Second Party');
    expect(text).toContain('Account Holder');
  });

  it('signature labels use party terms, not Client / Provider', async () => {
    const text = await buildText(templatedContractFixture);
    expect(text).toContain('First Party Signature');
    expect(text).toContain('Second Party Signature');
    expect(text).not.toContain('Client Signature');
    expect(text).not.toContain('Provider Signature');
  });

  it('removes legacy parenthetical (Client) / (Provider) row labels', async () => {
    const text = await buildText(templatedContractFixture);
    expect(text).not.toMatch(/\(Client\)/);
    expect(text).not.toMatch(/\(Provider\)/);
  });
});
