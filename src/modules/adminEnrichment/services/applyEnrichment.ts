import { supabase } from "@/integrations/supabase/client";
import type { EnrichmentApplyResult } from "../types";

export interface ApplyEnrichmentInput {
  session_id: string;
  mode: "lead" | "business";
  business_id?: string;
  approved: Record<string, string | undefined>;
}

export async function applyEnrichment(
  input: ApplyEnrichmentInput,
): Promise<EnrichmentApplyResult> {
  const { data, error } = await supabase.functions.invoke<EnrichmentApplyResult>(
    "admin-enrichment-apply",
    { body: input },
  );
  if (error) return { error: "request_failed" };
  return data ?? { error: "empty_response" };
}