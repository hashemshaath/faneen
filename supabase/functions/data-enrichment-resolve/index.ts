// DATA-ENRICHMENT-GOVERNANCE-1 — apply admin-chosen conflict resolutions.
import { corsHeaders, jsonResponse, requireAdmin, emitAudit } from "../_shared/dataEnrichment/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;
    const { record_id, conflicts } = await req.json().catch(() => ({})) as {
      record_id?: string;
      conflicts?: Array<{ field: string; resolved?: { source: string; value: string | null } | null }>;
    };
    if (!record_id || !Array.isArray(conflicts)) {
      return jsonResponse({ error: "invalid_input" }, 400);
    }
    const { data: row } = await ctx.service
      .from("data_enrichment_records").select("normalized,conflicts").eq("id", record_id).single();
    if (!row) return jsonResponse({ error: "record_not_found" }, 404);
    const normalized = { ...(row.normalized as Record<string, string | null>) };
    conflicts.forEach((c) => {
      if (c.resolved) normalized[c.field] = c.resolved.value;
    });
    const { error } = await ctx.service
      .from("data_enrichment_records")
      .update({ normalized, conflicts, status: "enriched" })
      .eq("id", record_id);
    if (error) return jsonResponse({ error: "update_failed", detail: error.message }, 200);

    for (const c of conflicts) {
      if (c.resolved) {
        await emitAudit(ctx.service, {
          record_id, field: c.field, new_value: c.resolved.value,
          source_key: c.resolved.source, actor_id: ctx.userId,
          action: "conflict_resolved",
        });
      }
    }
    return jsonResponse({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return jsonResponse({ ok: false, error: msg }, 200);
  }
});