import { supabase } from "@/integrations/supabase/client";
import type { Conflict } from "../types";

export async function resolveConflict<T = unknown>(input: {
  record_id: string;
  conflicts: Conflict[];
}) {
  return supabase.functions.invoke<T>("data-enrichment-resolve", { body: input });
}