/**
 * BUSINESS-WORKFLOW-5D — Public tokenized fetch for the client viewer.
 * Calls the SECURITY DEFINER RPC `get_quotation_by_token`. No raw quotation
 * tables are read directly — only the RPC payload (already redacted).
 */
import { supabase } from "@/integrations/supabase/client";
import type { PublicQuotationView } from "../types";

export async function getQuotationByToken(input: {
  refId: string;
  token: string;
}): Promise<{ data: PublicQuotationView | null; error: unknown }> {
  if (!input.refId || !input.token) {
    return { data: null, error: new Error("missing_required") };
  }
  const { data, error } = await supabase.rpc("get_quotation_by_token", {
    _ref_id: input.refId,
    _token: input.token,
  });
  if (error) return { data: null, error };
  return { data: (data as PublicQuotationView | null) ?? null, error: null };
}