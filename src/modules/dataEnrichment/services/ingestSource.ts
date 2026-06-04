import { supabase } from "@/integrations/supabase/client";
import type { SourceKey } from "../types";

export interface IngestInput {
  source: SourceKey;
  external_ref?: string | null;
  raw: Record<string, unknown>;
  target_entity_type?: string | null;
  target_entity_id?: string | null;
}

export async function ingestSource<T = unknown>(input: IngestInput) {
  return supabase.functions.invoke<T>("data-enrichment-ingest", { body: input });
}