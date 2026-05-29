import { describe, it, expect } from 'vitest';
import {
  buildProviderCreditsCsv,
  providerCreditsCsvFilename,
  CREDIT_CSV_HEADER,
  sanitizeCsvCell,
  type CreditCsvRow,
} from '@/lib/provider-credits-csv';

const REASON_LABEL: Record<string, string> = {
  monthly_grant: 'منح شهري',
  contact_reveal_consumption: 'استخدام لكشف بيانات تواصل',
};

const baseRow = (over: Partial<CreditCsvRow> = {}): CreditCsvRow => ({
  created_at: '2026-05-01T10:30:00.000Z',
  type: 'grant',
  reason: 'monthly_grant',
  amount: 10,
  balance_after: 50,
  quote_request_lead_id: null,
  ...over,
});

describe('buildProviderCreditsCsv', () => {
  it('emits the canonical header as the first line', () => {
    const csv = buildProviderCreditsCsv([], REASON_LABEL);
    expect(csv.split('\n')[0]).toBe(CREDIT_CSV_HEADER.join(','));
  });

  it('renders one row per transaction with ISO date and resolved reason label', () => {
    const csv = buildProviderCreditsCsv(
      [baseRow({ amount: 5, balance_after: 55, quote_request_lead_id: 'LED-100' })],
      REASON_LABEL,
    );
    const [, row] = csv.split('\n');
    expect(row).toBe('2026-05-01T10:30:00.000Z,grant,منح شهري,5,55,LED-100');
  });

  it('falls back to the raw reason key when no label exists', () => {
    const csv = buildProviderCreditsCsv([baseRow({ reason: 'unknown_reason' })], REASON_LABEL);
    expect(csv).toContain(',unknown_reason,');
  });

  it('never breaks columns: commas + newlines in reason labels are stripped', () => {
    const csv = buildProviderCreditsCsv(
      [baseRow({ reason: 'evil' })],
      { evil: 'a, b\nc, d' },
    );
    // 6 columns means exactly 5 commas per data line.
    const dataLine = csv.split('\n')[1];
    expect(dataLine.split(',').length).toBe(CREDIT_CSV_HEADER.length);
    expect(dataLine).not.toMatch(/\r|\n/);
  });

  it('handles empty lead id as empty cell, not the string "null"', () => {
    const csv = buildProviderCreditsCsv([baseRow()], REASON_LABEL);
    expect(csv.endsWith(',')).toBe(true);
    expect(csv).not.toMatch(/,null$/);
  });
});

describe('sanitizeCsvCell', () => {
  it('collapses newlines and commas into single space and trims', () => {
    expect(sanitizeCsvCell('  a,\nb,\r\nc  ')).toBe('a b c');
  });
});

describe('providerCreditsCsvFilename', () => {
  it('stamps the file with YYYY-MM-DD prefix and .csv extension', () => {
    const name = providerCreditsCsvFilename(new Date('2026-05-29T12:00:00Z'));
    expect(name).toBe('provider-credits-2026-05-29.csv');
  });
});