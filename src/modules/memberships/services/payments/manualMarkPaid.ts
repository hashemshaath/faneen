import type { MarkMembershipPaidManuallyInput } from './types';

/**
 * R4F-8C: Placeholder for `admin_mark_membership_paid_manually` RPC.
 *
 * The RPC does NOT exist yet. This scaffold throws on invocation so callers
 * cannot silently mis-use it. R4F-8D/R4F-8F will implement the RPC and
 * replace this body with `supabase.rpc(...)`. No UI callsites in this phase.
 */
export async function markMembershipPaidManually(
  _input: MarkMembershipPaidManuallyInput,
): Promise<never> {
  throw new Error('admin_mark_membership_paid_manually is not implemented yet');
}