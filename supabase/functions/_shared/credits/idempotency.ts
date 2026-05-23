// EDGE-2: Deterministic, UTC-safe idempotency key builders.
// Mirrors the format used inside the SECURITY DEFINER RPCs.

export function buildRevealIdempotencyKey(input: { leadId: string; userId: string }): string {
  return `reveal:${input.leadId}:${input.userId}`;
}

export function buildMonthlyGrantIdempotencyKey(input: {
  subscriptionId: string;
  periodStart: string | Date;
}): string {
  const d = input.periodStart instanceof Date ? input.periodStart : new Date(input.periodStart);
  const year = d.getUTCFullYear().toString().padStart(4, '0');
  const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
  return `monthly:${input.subscriptionId}:${year}-${month}`;
}