// GOOGLE-INTEGRATION-GOVERNANCE-AUDIT-1
import { supabase } from "@/integrations/supabase/client";
import type { GoogleHealthResponse } from "./types";

export async function fetchGoogleHealth(): Promise<GoogleHealthResponse | null> {
  const { data, error } = await supabase.functions.invoke("google-health", { body: {} });
  if (error) return null;
  return (data as GoogleHealthResponse) ?? null;
}