/**
 * BUSINESS-WORKFLOW-5D / 5E — Public approve via SECURITY DEFINER RPC.
 *
 * Captures the client's typed signature alongside an explicit consent checkbox
 * (the checkbox is enforced in the UI). Optional `approved_by_title` and the
 * pre-hashed `approval_ip_hash` / `approval_user_agent_hash` are stored only
 * when provided — raw IP / UA never reach the database. The approval token
 * stays SHA-256 hashed and is never logged or returned.
 */
import { supabase } from "@/integrations/supabase/client";

export interface ApproveWorkOrderQuotationInput {
  refId: string;
  token: string;
  approvedByName: string;
  signatureText: string;
  approvedByTitle?: string | null;
  /** Pre-hashed identifiers — never raw. */
  approvalIpHash?: string | null;
  approvalUserAgentHash?: string | null;
}

export async function approveWorkOrderQuotation(
  input: ApproveWorkOrderQuotationInput,
): Promise<{ ok: boolean; error: unknown }> {
  if (!input.refId || !input.token || input.token.length < 32) {
    return { ok: false, error: new Error("invalid_token") };
  }
  const name = (input.approvedByName ?? "").trim().slice(0, 200);
  const sig = (input.signatureText ?? "").trim().slice(0, 200);
  if (!name || !sig) {
    return { ok: false, error: new Error("signature_required") };
  }
  const title = (input.approvedByTitle ?? "").trim().slice(0, 200) || null;
  const ipHash = (input.approvalIpHash ?? "").trim() || null;
  const uaHash = (input.approvalUserAgentHash ?? "").trim() || null;
  const { error } = await supabase.rpc("approve_quotation_by_token", {
    _ref_id: input.refId,
    _token: input.token,
    _approved_by_name: name,
    _signature_text: sig,
    _approved_by_title: title,
    _ip_hash: ipHash,
    _user_agent_hash: uaHash,
  });
  if (error) return { ok: false, error };
  return { ok: true, error: null };
}