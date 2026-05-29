/**
 * Pure helpers for building the provider credit-log CSV export.
 *
 * Kept framework-free so it can be unit-tested without React / DOM.
 * The page wires `buildProviderCreditsCsv` into a Blob + download anchor.
 */

export interface CreditCsvRow {
  created_at: string;
  type: string;
  reason: string;
  amount: number;
  balance_after: number;
  quote_request_lead_id: string | null;
}

export const CREDIT_CSV_HEADER = [
  'date',
  'type',
  'reason',
  'amount',
  'balance_after',
  'lead_id',
] as const;

/** Sanitize a single CSV cell — never break the column layout. */
export function sanitizeCsvCell(value: string): string {
  // Strip commas, CR/LF, and surrounding whitespace.
  return value.replace(/[\r\n,]+/g, ' ').trim();
}

/**
 * Build a UTF-8 CSV body (without BOM) from credit-log rows.
 * Caller is responsible for prepending the BOM (`\uFEFF`) when writing to disk.
 */
export function buildProviderCreditsCsv(
  rows: ReadonlyArray<CreditCsvRow>,
  reasonLabel: Readonly<Record<string, string>> = {},
): string {
  const lines: string[] = [CREDIT_CSV_HEADER.join(',')];
  for (const t of rows) {
    const reason = sanitizeCsvCell(reasonLabel[t.reason] ?? t.reason);
    lines.push(
      [
        new Date(t.created_at).toISOString(),
        sanitizeCsvCell(t.type),
        reason,
        String(t.amount),
        String(t.balance_after),
        sanitizeCsvCell(t.quote_request_lead_id ?? ''),
      ].join(','),
    );
  }
  return lines.join('\n');
}

/** Suggested filename for the downloaded CSV (date stamped). */
export function providerCreditsCsvFilename(now: Date = new Date()): string {
  return `provider-credits-${now.toISOString().slice(0, 10)}.csv`;
}