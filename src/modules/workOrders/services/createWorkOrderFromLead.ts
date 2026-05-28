import { getCurrentUser } from "@/modules/identity/services/session/getCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { createWorkOrder } from "./createWorkOrder";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";
import type { WorkOrderRow, WorkOrderPriority } from "../types";

export interface CreateWorkOrderFromLeadInput {
  leadRequestId: string;
  /** Explicit business_id. Validated against the lead's own business_id. */
  businessId?: string;
  title?: string;
  description?: string;
  priority?: WorkOrderPriority;
}

const SAFE_REF = /^[A-Z]{2,6}-[A-Z0-9]+$/;

/**
 * BUSINESS-CORE-10 — Manual conversion of a lead request into a work order.
 *
 * - Reads `lead_requests` under the caller's JWT (RLS gates provider/admin
 *   access — no service_role, no bypass).
 * - Resolves business_id from the lead row directly; if an explicit
 *   `businessId` is supplied it must match (otherwise rejected).
 * - Delegates insert to `createWorkOrder`, persisting:
 *     source_type   = 'lead'
 *     source_id     = lead.id (UUID, never displayed)
 *     source_ref_id = lead.ref_id (LED-… official ref only, never fabricated)
 * - Emits `work_order.created_from_lead` audit event.
 */
export async function createWorkOrderFromLead(
  input: CreateWorkOrderFromLeadInput,
): Promise<{ data: WorkOrderRow | null; error: unknown }> {
  const { leadRequestId } = input;
  if (!leadRequestId) {
    return { data: null, error: new Error("lead_request_id_required") };
  }

  const { data: userRes, error: userErr } = await getCurrentUser();
  const uid = userRes?.user?.id ?? null;
  if (userErr || !uid) {
    return { data: null, error: userErr ?? new Error("not_authenticated") };
  }

  // Load lead row through RLS — provider/admin gating is enforced by policy.
  const { data: lead, error: leadErr } = await supabase
    .from("lead_requests")
    .select("id, ref_id, business_id, subject, name, message")
    .eq("id", leadRequestId)
    .maybeSingle();

  if (leadErr || !lead) {
    return { data: null, error: leadErr ?? new Error("lead_request_not_found_or_no_access") };
  }

  const resolvedBusinessId = input.businessId ?? lead.business_id;
  if (input.businessId && input.businessId !== lead.business_id) {
    return { data: null, error: new Error("business_id_mismatch") };
  }

  // Only accept an official LED-style ref — never derive one from a UUID.
  const rawRef = (lead.ref_id ?? "").trim().toUpperCase();
  const sourceRefId = SAFE_REF.test(rawRef) ? rawRef : null;

  const defaultTitle =
    (input.title ?? "").trim() ||
    (lead.subject || lead.name || lead.message || "Work order")
      .toString()
      .slice(0, 200);

  const { data: wo, error: woErr } = await createWorkOrder({
    business_id: resolvedBusinessId,
    owner_user_id: uid,
    created_by_user_id: uid,
    title: defaultTitle,
    priority: input.priority ?? "medium",
    source_type: "lead",
    source_id: lead.id,
    source_ref_id: sourceRefId,
  });

  if (woErr || !wo) return { data: null, error: woErr };

  await recordWorkOrderAudit({
    business_id: wo.business_id,
    actor_id: uid,
    entity_id: wo.id,
    action: "work_order.created_from_lead",
    metadata: {
      ref_id: wo.ref_id,
      lead_ref_id: sourceRefId,
      description: input.description ?? null,
    },
  });

  return { data: wo, error: null };
}