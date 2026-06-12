/**
 * EF-6 canonical wrapper: invokes an integration health edge function
 * (google-health, resend-health, moyasar-health, lovable-ai-health,
 * firecrawl-health, resend-status). Used by the unified Integrations
 * dashboard to probe configured services without exposing keys.
 */
import { supabase } from "@/integrations/supabase/client";

export interface IntegrationProbeResult {
  service: string;
  ok?: boolean;
  deferred?: boolean;
  latencyMs?: number;
  status?: number;
  errorCode?: string | null;
  missing?: string[];
  checkedAt?: string;
  warnings?: string[];
  apis?: Record<string, { ok: boolean; latencyMs: number; status: number; errorCode: string | null } | null>;
  healthScore?: number;
}

export async function probeIntegrationHealth(fn: string): Promise<IntegrationProbeResult> {
  try {
    const { data, error } = await supabase.functions.invoke(fn, { body: {} });
    if (error) return { service: fn, ok: false, errorCode: error.message };
    const result = (data ?? { service: fn, ok: false, errorCode: "no_response" }) as IntegrationProbeResult;
    if (result.apis && result.ok === undefined) {
      const probes = Object.values(result.apis).filter(Boolean) as Array<{ ok: boolean }>;
      result.ok = probes.length > 0 && probes.every((p) => p.ok);
    }
    if (!result.checkedAt) result.checkedAt = new Date().toISOString();
    return result;
  } catch (e) {
    return { service: fn, ok: false, errorCode: e instanceof Error ? e.message : "exception" };
  }
}