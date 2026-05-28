/**
 * BUSINESS-WORKFLOW-5E — Manager/admin RPC: create a contract DRAFT from an
 * approved quotation. Idempotent — returns the existing linked contract on
 * repeat calls. Never creates payments, invoices, signed URLs, or sends
 * notifications.
 */
import { supabase } from "@/integrations/supabase/client";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";

export interface CreateContractDraftFromApprovedQuotationInput {
  quotationId: string;
  /** Local-only audit context. Server doesn't need it. */
  businessId?: string;
  workOrderId?: string;
  actorId?: string;
  quotationRefId?: string | null;
}

export interface CreateContractDraftFromApprovedQuotationResult {
  contractId: string | null;
  alreadyExisted: boolean;
  error: unknown;
}

export async function createContractDraftFromApprovedQuotation(
  input: CreateContractDraftFromApprovedQuotationInput,
): Promise<CreateContractDraftFromApprovedQuotationResult> {
  if (!input.quotationId) {
    return { contractId: null, alreadyExisted: false, error: new Error("missing_quotation") };
  }
  const { data, error } = await supabase.rpc(
    "create_contract_draft_from_quotation",
    { _quotation_id: input.quotationId },
  );
  if (error) {
    return { contractId: null, alreadyExisted: false, error };
  }
  const row = (data ?? {}) as {
    contract_id?: string;
    already_existed?: boolean;
  };
  const contractId = row.contract_id ?? null;
  const alreadyExisted = Boolean(row.already_existed);

  if (
    contractId &&
    !alreadyExisted &&
    input.businessId &&
    input.actorId &&
    input.workOrderId
  ) {
    await recordWorkOrderAudit({
      business_id: input.businessId,
      actor_id: input.actorId,
      entity_id: input.workOrderId,
      action: "work_order.quotation_converted_to_contract_draft",
      metadata: {
        quotation_id: input.quotationId,
        quotation_ref_id: input.quotationRefId ?? null,
        contract_id: contractId,
      },
    });
  }

  return { contractId, alreadyExisted, error: null };
}