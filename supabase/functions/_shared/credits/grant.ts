// EDGE-2: Atomic monthly grant via grant_monthly_provider_credit RPC.
import type { GrantMonthlyProviderCreditsInput, SupabaseAdminLike } from './types.ts';

export async function grantMonthlyProviderCredit(
  admin: SupabaseAdminLike,
  input: GrantMonthlyProviderCreditsInput,
) {
  return await admin.rpc('grant_monthly_provider_credit', {
    p_subscription_id: input.subscriptionId,
    p_amount: input.amount,
    p_period_start: input.periodStart,
    p_period_end: input.periodEnd,
    p_plan_code: input.planCode ?? null,
  });
}