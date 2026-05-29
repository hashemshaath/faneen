/**
 * Number & date formatting helpers.
 *
 * Project policy: ALL numeric values rendered in the UI must use Latin (English)
 * digits, even when the active language is Arabic. Use `fmtNum` / `fmtDate` /
 * `fmtDateTime` instead of calling `toLocaleString` directly with `'ar-SA'`.
 */

const AR_LATIN = 'ar-SA-u-nu-latn';

/** Format a number with Latin digits (uses en-US grouping for consistency). */
export function fmtNum(
  value: number | null | undefined,
  opts?: Intl.NumberFormatOptions,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  try {
    return new Intl.NumberFormat('en-US', opts).format(value);
  } catch {
    return String(value);
  }
}

/** Compact number formatting (1.2K, 3.4M). Latin digits. */
export function fmtCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  try {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  } catch {
    return String(value);
  }
}

/** Currency with Latin digits. */
export function fmtCurrency(
  value: number | null | undefined,
  currency = 'SAR',
  opts?: Intl.NumberFormatOptions,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, ...opts }).format(value);
  } catch {
    return String(value);
  }
}

/** Date with Latin digits in both Arabic and English locales. */
export function fmtDate(
  value: string | number | Date | null | undefined,
  isRTL: boolean,
  opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat(isRTL ? AR_LATIN : 'en-US', opts).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/** Date + time with Latin digits. */
export function fmtDateTime(
  value: string | number | Date | null | undefined,
  isRTL: boolean,
  opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
): string {
  return fmtDate(value, isRTL, opts);
}