// DATA-ENRICHMENT-GOVERNANCE-1 — record a quality snapshot for an entity.
import { corsHeaders, jsonResponse, requireAdmin } from "../_shared/dataEnrichment/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;
    const { entity_type, entity_id, score, breakdown } = await req.json().catch(() => ({})) as {
      entity_type?: string;
      entity_id?: string;
      score?: number;
      breakdown?: Record<string, number>;
    };
    if (!entity_type || !entity_id || typeof score !== "number") {
      return jsonResponse({ error: "invalid_input" }, 400);
    }
    const { error } = await ctx.service
      .from("data_enrichment_quality_snapshots")
      .insert({ entity_type, entity_id, score, breakdown: breakdown ?? {} });
    if (error) return jsonResponse({ error: "insert_failed", detail: error.message }, 200);
    return jsonResponse({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return jsonResponse({ ok: false, error: msg }, 200);
  }
});