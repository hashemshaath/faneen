import { supabase } from "@/integrations/supabase/client";

export interface ClearCacheResult {
  ok?: boolean;
  deleted?: number;
  scope?: string;
  error?: string;
}

export async function clearEnrichmentCache(
  scope: "all" | "search" | "web" | "maps" = "all",
): Promise<ClearCacheResult> {
  const { data, error } = await supabase.functions.invoke<ClearCacheResult>(
    "admin-enrichment-cache-clear",
    { body: { scope } },
  );
  if (error) return { error: "request_failed" };
  return data ?? { error: "empty_response" };
}