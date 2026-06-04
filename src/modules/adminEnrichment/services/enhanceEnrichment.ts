import { supabase } from "@/integrations/supabase/client";
import type { EnrichmentEnhanceResult } from "../types";

export async function enhanceEnrichment(
  input: Record<string, string | null | undefined>,
): Promise<EnrichmentEnhanceResult> {
  const { data, error } = await supabase.functions.invoke<EnrichmentEnhanceResult>(
    "admin-enrichment-enhance",
    { body: input },
  );
  if (error) return { ok: false };
  return data ?? { ok: false };
}