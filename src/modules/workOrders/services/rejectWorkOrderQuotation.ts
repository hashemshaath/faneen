/**
 * BUSINESS-WORKFLOW-5D — Public reject via SECURITY DEFINER RPC.
 */
import { supabase } from "@/integrations/supabase/client";

export interface RejectWorkOrderQuotationInput {
  refId: string;
  token: string;
  reason?: string | null;
}

export async function rejectWorkOrderQuotation(
  input: RejectWorkOrderQuotationInput,
): Promise<{ ok: boolean; error: unknown }> {
  if (!input.refId || !input.token || input.token.length < 32) {
    return { ok: false, error: new Error("invalid_token") };
  }
  const reason = (input.reason ?? "").trim().slice(0, 2000) || null;
  const { error } = await supabase.rpc("reject_quotation_by_token", {
    _ref_id: input.refId,
    _token: input.token,
    _reason: reason,
  });
  if (error) return { ok: false, error };
  return { ok: true, error: null };
}