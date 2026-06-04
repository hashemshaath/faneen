import { supabase } from "@/integrations/supabase/client";

export async function runEnrichment<T = unknown>(input: { record_id: string }) {
  return supabase.functions.invoke<T>("data-enrichment-run", { body: input });
}