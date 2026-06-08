/** Day counter helpers for rental orders. Pure & framework-free. */
export type AlertTier = 'safe' | 't7' | 't3' | 't1' | 'expired' | 'overdue';

const MS_DAY = 86_400_000;

function toDate(d: Date | string): Date {
  return typeof d === 'string' ? new Date(d) : d;
}

function diffDays(a: Date, b: Date): number {
  // floor of day difference (a - b)
  const ad = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bd = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ad - bd) / MS_DAY);
}

export function totalDays(start: Date | string, end: Date | string): number {
  return Math.max(1, diffDays(toDate(end), toDate(start)) + 1);
}

export function daysLeft(end: Date | string, now: Date = new Date()): number {
  return diffDays(toDate(end), now);
}

export function overdueDays(end: Date | string, now: Date = new Date()): number {
  const d = diffDays(now, toDate(end));
  return Math.max(0, d);
}

export function alertTier(end: Date | string, now: Date = new Date()): AlertTier {
  const left = daysLeft(end, now);
  if (left < 0) return left <= -1 ? 'overdue' : 'expired';
  if (left === 0) return 'expired';
  if (left <= 1) return 't1';
  if (left <= 3) return 't3';
  if (left <= 7) return 't7';
  return 'safe';
}