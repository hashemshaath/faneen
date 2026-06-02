/**
 * MEMBERSHIP-PAYMENT-ACTIVATION-1
 *
 * Canonical, pure billing-cycle period math. Duplicated verbatim into
 * the Deno edge helper at
 * `supabase/functions/_shared/membership-payments/index.ts` because edge
 * functions cannot import from `src/`. The
 * `membershipPaymentActivation1.test.ts` regression test asserts both
 * sides stay in sync.
 *
 * Rules:
 *   - monthly  → +1 calendar month
 *   - yearly / annual → +1 calendar year
 *   - unknown → null (caller preserves existing expiry)
 *   - Renewal: if `currentExpiresAt` is still in the future, the new
 *     period extends from that expiry; otherwise it anchors at startAt.
 */
export function computeMembershipPeriodEnd(args: {
  billingCycle: string | null | undefined;
  startAt: Date;
  currentExpiresAt?: Date | null;
  now?: Date;
}): Date | null {
  const cycle = (args.billingCycle ?? '').trim().toLowerCase();
  const now = args.now ?? new Date();
  const anchor =
    args.currentExpiresAt && args.currentExpiresAt.getTime() > now.getTime()
      ? new Date(args.currentExpiresAt)
      : new Date(args.startAt);

  const end = new Date(anchor);
  if (cycle === 'monthly') {
    end.setUTCMonth(end.getUTCMonth() + 1);
    return end;
  }
  if (cycle === 'yearly' || cycle === 'annual') {
    end.setUTCFullYear(end.getUTCFullYear() + 1);
    return end;
  }
  return null;
}