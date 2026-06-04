import { supabase } from "@/integrations/supabase/client";
import type { EnrichmentFetchResult } from "../types";

export async function fetchEnrichment(input: {
  website?: string;
  mapsUrl?: string;
  bypassCache?: boolean;
  placeId?: string;
}): Promise<EnrichmentFetchResult> {
  const { data, error } = await supabase.functions.invoke<EnrichmentFetchResult>(
    "admin-enrichment-fetch",
    { body: input },
  );
  if (error) return { error: "request_failed" };
  return data ?? { error: "empty_response" };
}