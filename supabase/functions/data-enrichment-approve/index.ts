// DATA-ENRICHMENT-GOVERNANCE-1 — approve or reject a record.
// Approval marks the record `approved` and writes an audit row. Applying the
// approved payload to a target entity is the responsibility of the caller
// (admin-enrichment-apply / provider intake), keeping this function side-effect
// free beyond the governance tables.
import { corsHeaders, jsonResponse, requireAdmin, emitAudit } from "../_shared/dataEnrichment/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;
    const { record_id, decision, reason } = await req.json().catch(() => ({})) as {
      record_id?: string;
      decision?: "approve" | "reject";
      reason?: string;
    };
    if (!record_id || (decision !== "approve" && decision !== "reject")) {
      return jsonResponse({ error: "invalid_input" }, 400);
    }
    const status = decision === "approve" ? "approved" : "rejected";
    const { error } = await ctx.service
      .from("data_enrichment_records")
      .update({ status, reviewed_by: ctx.userId, reviewed_at: new Date().toISOString(), notes: reason ?? null })
      .eq("id", record_id);
    if (error) return jsonResponse({ error: "update_failed", detail: error.message }, 200);
    await emitAudit(ctx.service, {
      record_id, actor_id: ctx.userId,
      action: decision === "approve" ? "enrichment_approved" : "enrichment_rejected",
      reason: reason ?? null,
    });
    return jsonResponse({ ok: true, status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return jsonResponse({ ok: false, error: msg }, 200);
  }
});