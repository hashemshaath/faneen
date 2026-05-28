import { getCurrentUser } from "@/modules/identity/services/session/getCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { createWorkOrder } from "./createWorkOrder";
import { recordWorkOrderAudit } from "./recordWorkOrderAudit";
import { recordBusinessSourceAudit } from "@/modules/businesses/notes";
import type { WorkOrderRow, WorkOrderPriority } from "../types";

export interface CreateWorkOrderFromQuoteInput {
  quoteRequestId: string;
  /** Explicit business_id (provider_id from lead context). Required when ambiguous. */
  businessId?: string;
  title?: string;
  description?: string;
  priority?: WorkOrderPriority;
}

const SAFE_REF = /^[A-Z]{2,6}-[A-Z0-9]+$/;

/**
 * BUSINESS-CORE-9 — Manual conversion of a quote request into a work order.
 *
 * - Reads the quote request THROUGH the existing quote_request_leads RLS layer
 *   (never direct table access). This works for both providers and admins:
 *     • Providers see only their own leads (RLS gates).
 *     • Admins see all leads.
 * - Resolves business_id from the lead's provider_id, or falls back to an
 *   explicit `businessId` validated against the lead relationship.
 * - Delegates insert to `createWorkOrder`, persisting:
 *     source_type   = 'quote'
 *     source_id     = quote.id (UUID, never displayed)
 *     source_ref_id = quote.ref_id (QTE-… official ref only)
 * - Emits `work_order.created_from_quote` audit event.
 *
 * Never invents a source_ref_id and never bypasses RLS.
 */
export async function createWorkOrderFromQuote(
  input: CreateWorkOrderFromQuoteInput,
): Promise<{ data: WorkOrderRow | null; error: unknown }> {
  const { quoteRequestId } = input;
  if (!quoteRequestId) {
    return { data: null, error: new Error("quote_request_id_required") };
  }

  const { data: userRes, error: userErr } = await getCurrentUser();
  const uid = userRes?.user?.id ?? null;
  if (userErr || !uid) {
    return { data: null, error: userErr ?? new Error("not_authenticated") };
  }

  // Resolve business_id — try auto-resolve from accessible leads first.
  let resolvedBusinessId = input.businessId ?? null;
  if (!resolvedBusinessId) {
    const { data: leads, error: leadsErr } = await supabase
      .from("quote_request_leads")
      .select("provider_id")
      .eq("quote_request_id", quoteRequestId);

    if (leadsErr) return { data: null, error: leadsErr };

    const accessible = leads ?? [];
    if (accessible.length === 1) {
      resolvedBusinessId = accessible[0].provider_id;
    } else if (accessible.length === 0) {
      return { data: null, error: new Error("quote_request_not_found_or_no_access") };
    } else {
      return { data: null, error: new Error("business_id_required_multiple_leads") };
    }
  }

  // Validate access by loading through quote_request_leads (provider-safe).
  // The nested select fetches the quote request data we need.
  const { data: leadCheck, error: leadErr } = await supabase
    .from("quote_request_leads")
    .select("provider_id, quote_request:quote_requests(id, ref_id, project_description)")
    .eq("quote_request_id", quoteRequestId)
    .eq("provider_id", resolvedBusinessId)
    .maybeSingle();

  if (leadErr || !leadCheck) {
    return { data: null, error: leadErr ?? new Error("quote_request_access_denied") };
  }

  const qr = (leadCheck as unknown as Record<string, unknown>).quote_request as
    | { id: string; ref_id: string | null; project_description: string | null }
    | null;

  if (!qr) {
    return { data: null, error: new Error("quote_request_not_found") };
  }

  // Only accept an official QTE reference — never derive one from UUID.
  const rawRef = (qr.ref_id ?? "").trim().toUpperCase();
  const sourceRefId = SAFE_REF.test(rawRef) ? rawRef : null;

  const defaultTitle =
    (input.title ?? "").trim() ||
    (qr.project_description || "Work order").slice(0, 200);

  const { data: wo, error: woErr } = await createWorkOrder({
    business_id: resolvedBusinessId,
    owner_user_id: uid,
    created_by_user_id: uid,
    title: defaultTitle,
    priority: input.priority ?? "medium",
    source_type: "quote",
    source_id: qr.id,
    source_ref_id: sourceRefId,
  });

  if (woErr || !wo) return { data: null, error: woErr };

  await recordWorkOrderAudit({
    business_id: wo.business_id,
    actor_id: uid,
    entity_id: wo.id,
    action: "work_order.created_from_quote",
    metadata: {
      ref_id: wo.ref_id,
      quote_ref_id: sourceRefId,
      description: input.description ?? null,
    },
  });

  await recordBusinessSourceAudit({
    business_id: wo.business_id,
    actor_id: uid,
    entity_type: "quote",
    entity_id: qr.id,
    action: "quote.converted_to_work_order",
    metadata: {
      quote_ref_id: sourceRefId,
      work_order_ref_id: wo.ref_id,
      source_type: "quote",
    },
  });

  return { data: wo, error: null };
}
