/**
 * BUSINESS-WORKFLOW-5D — Public approve via SECURITY DEFINER RPC.
 * Never logs or returns the raw token. Locks the quotation server-side.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ApproveWorkOrderQuotationInput {
  refId: string;
  token: string;
}

export async function approveWorkOrderQuotation(
  input: ApproveWorkOrderQuotationInput,
): Promise<{ ok: boolean; error: unknown }> {
  if (!input.refId || !input.token || input.token.length < 32) {
    return { ok: false, error: new Error("invalid_token") };
  }
  const { error } = await supabase.rpc("approve_quotation_by_token", {
    _ref_id: input.refId,
    _token: input.token,
  });
  if (error) return { ok: false, error };
  return { ok: true, error: null };
}