// EDGE-2: Atomic provider credit debit via consume_provider_lead_credit RPC.
import type { DebitProviderLeadCreditInput, SupabaseAdminLike } from './types.ts';

export async function debitProviderLeadCredit(
  admin: SupabaseAdminLike,
  input: DebitProviderLeadCreditInput,
) {
  return await admin.rpc('consume_provider_lead_credit', {
    p_business_id: input.businessId,
    p_cost: input.cost,
    p_reason: input.reason,
    p_quote_request_lead_id: input.quoteRequestLeadId ?? null,
    p_created_by: input.createdBy ?? null,
    p_idempotency_key: input.idempotencyKey ?? null,
  });
}