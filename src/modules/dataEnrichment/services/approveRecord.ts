import { supabase } from "@/integrations/supabase/client";

export async function approveRecord<T = unknown>(input: {
  record_id: string;
  decision: "approve" | "reject";
  reason?: string;
}) {
  return supabase.functions.invoke<T>("data-enrichment-approve", { body: input });
}