import { getContractById } from "@/modules/contracts/services/reads/getContractById";
import { getCurrentUser } from "@/modules/identity/services/session/getCurrentUser";
import { createWorkOrder } from "./createWorkOrder";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";
import { recordBusinessSourceAudit } from "@/modules/businesses/notes";
import type { WorkOrderRow, WorkOrderPriority } from "../types";

export interface CreateWorkOrderFromContractInput {
  contractId: string;
  /** Required only when the contract row does not carry a business_id (e.g. guest/client-side contracts). */
  businessId?: string;
  title?: string;
  description?: string;
  priority?: WorkOrderPriority;
}

const SAFE_REF = /^[A-Z]{2,6}-[A-Z0-9]+$/;

/**
 * BUSINESS-CORE-8 — Manual conversion of a contract into a work order.
 *
 * - Reads the contract through the contracts module wrapper (RLS-gated).
 * - Resolves the owning business from contract.business_id, or falls back to
 *   an explicit `businessId` validated against the contract.
 * - Delegates the insert to `createWorkOrder`, persisting:
 *     source_type   = 'contract'
 *     source_id     = contract.id (UUID, never displayed)
 *     source_ref_id = contract.contract_number (CNT-… official ref only)
 * - Emits `work_order.created_from_contract` audit event.
 *
 * Never invents a source_ref_id and never bypasses RLS.
 */
export async function createWorkOrderFromContract(
  input: CreateWorkOrderFromContractInput,
): Promise<{ data: WorkOrderRow | null; error: unknown }> {
  const { contractId } = input;
  if (!contractId) return { data: null, error: new Error("contract_id_required") };

  const { data: contract, error: contractErr } = await getContractById<{
    id: string;
    business_id: string | null;
    contract_number: string | null;
    title_ar: string | null;
    title_en: string | null;
  }>({
    id: contractId,
    select: "id, business_id, contract_number, title_ar, title_en",
  });
  if (contractErr || !contract) {
    return { data: null, error: contractErr ?? new Error("contract_not_found") };
  }

  // Resolve owning business — never silently choose.
  const resolvedBusinessId = contract.business_id ?? input.businessId ?? null;
  if (!resolvedBusinessId) {
    return { data: null, error: new Error("business_id_required") };
  }
  if (
    input.businessId &&
    contract.business_id &&
    input.businessId !== contract.business_id
  ) {
    return { data: null, error: new Error("business_id_mismatch") };
  }

  // Identify acting user (auth-gated; RLS enforces is_work_order_member on insert).
  const { data: userRes, error: userErr } = await getCurrentUser();
  const uid = userRes?.user?.id ?? null;
  if (userErr || !uid) {
    return { data: null, error: userErr ?? new Error("not_authenticated") };
  }

  // Only accept an official contract reference — never derive one from the UUID.
  const rawRef = (contract.contract_number ?? "").trim().toUpperCase();
  const sourceRefId = SAFE_REF.test(rawRef) ? rawRef : null;

  const defaultTitle =
    (input.title ?? "").trim() ||
    (contract.title_ar || contract.title_en || contract.contract_number || "Work order").toString();

  const { data: wo, error: woErr } = await createWorkOrder({
    business_id: resolvedBusinessId,
    owner_user_id: uid,
    created_by_user_id: uid,
    title: defaultTitle.slice(0, 200),
    priority: input.priority ?? "medium",
    source_type: "contract",
    source_id: contract.id,
    source_ref_id: sourceRefId,
  });
  if (woErr || !wo) return { data: null, error: woErr };

  await recordWorkOrderAudit({
    business_id: wo.business_id,
    actor_id: uid,
    entity_id: wo.id,
    action: "work_order.created_from_contract",
    metadata: {
      ref_id: wo.ref_id,
      contract_ref_id: sourceRefId,
      description: input.description ?? null,
    },
  });

  // BUSINESS-CORE-13 — source-side lifecycle event for the unified feed.
  await recordBusinessSourceAudit({
    business_id: wo.business_id,
    actor_id: uid,
    entity_type: "contract",
    entity_id: contract.id,
    action: "contract.converted_to_work_order",
    metadata: {
      contract_ref_id: sourceRefId,
      work_order_ref_id: wo.ref_id,
      source_type: "contract",
    },
  });

  return { data: wo, error: null };
}