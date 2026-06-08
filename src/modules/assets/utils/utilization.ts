/** Pure utilization math. Returns a 0-100 percentage with 2 decimals. */
export function computeUtilization(daysRented: number, totalDays: number): number {
  if (!Number.isFinite(daysRented) || !Number.isFinite(totalDays) || totalDays <= 0) return 0;
  const clampedRented = Math.max(0, Math.min(daysRented, totalDays));
  return Math.round((clampedRented / totalDays) * 10000) / 100;
}

export function isLowUtilization(rate: number, threshold = 25): boolean {
  return Number.isFinite(rate) && rate < threshold;
}