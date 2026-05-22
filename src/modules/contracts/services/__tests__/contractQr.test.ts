import { describe, it, expect } from 'vitest';
import { buildContractVerificationUrl } from '@/modules/contracts/services/pdf/barcode/contractQr';

describe('buildContractVerificationUrl', () => {
  it('uses /q/<barcode> when barcode is present', () => {
    expect(
      buildContractVerificationUrl({
        origin: 'https://x.com',
        contractBarcodeCode: 'CNT-2026-100007',
        contractNumber: 'CT-001',
        documentHash: '',
      }),
    ).toBe('https://x.com/q/CNT-2026-100007');
  });

  it('falls back to /v/c/<number>?h=<hash> when no barcode', () => {
    expect(
      buildContractVerificationUrl({
        origin: 'https://x.com',
        contractBarcodeCode: '',
        contractNumber: 'CT-001',
        documentHash: 'abcdef123456',
      }),
    ).toBe('https://x.com/v/c/CT-001?h=abcdef123456');
  });

  it('prefers barcode when both barcode and hash are present', () => {
    expect(
      buildContractVerificationUrl({
        origin: 'https://x.com',
        contractBarcodeCode: 'CNT-9',
        contractNumber: 'CT-001',
        documentHash: 'abcdef123456',
      }),
    ).toBe('https://x.com/q/CNT-9');
  });

  it('encodes special chars in barcode', () => {
    expect(
      buildContractVerificationUrl({
        origin: 'https://x.com',
        contractBarcodeCode: 'A/B C',
        contractNumber: 'X',
        documentHash: '',
      }),
    ).toBe('https://x.com/q/A%2FB%20C');
  });

  it('encodes special chars in contractNumber and documentHash', () => {
    expect(
      buildContractVerificationUrl({
        origin: 'https://x.com',
        contractBarcodeCode: '',
        contractNumber: 'CT/001 A',
        documentHash: 'h ash/v=1',
      }),
    ).toBe('https://x.com/v/c/CT%2F001%20A?h=h%20ash%2Fv%3D1');
  });

  it('never produces forbidden URL tokens', () => {
    const urls = [
      buildContractVerificationUrl({
        origin: 'https://x.com',
        contractBarcodeCode: 'CNT-9',
        contractNumber: 'CT-001',
        documentHash: 'abcdef123456',
      }),
      buildContractVerificationUrl({
        origin: 'https://x.com',
        contractBarcodeCode: '',
        contractNumber: 'CT-001',
        documentHash: 'abcdef123456',
      }),
    ];
    for (const url of urls) {
      for (const tok of ['/s/', 'token=', 'X-Amz-Signature', 'qr_token_hash', 'current_scan_token_hash']) {
        expect(url, `must not contain "${tok}"`).not.toContain(tok);
      }
    }
  });
});