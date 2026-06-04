// DATA-ENRICHMENT-GOVERNANCE-1 — ingest a payload from any registered source.
// Status starts at `imported`. Caller (or follow-up cron / data-enrichment-run)
// drives it through normalize/translate/score/conflict-detect/review.
import { corsHeaders, jsonResponse, requireAdminOrSourceToken, emitAudit } from "../_shared/dataEnrichment/auth.ts";

const ALLOWED_SOURCES = new Set([
  "google_places","google_maps","firecrawl_website","website_crawl",
  "national_address","manual_admin","provider_registration",
  "supplier_import","csv_import","brand_import","future_api",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ctx = await requireAdminOrSourceToken(req);
    if (ctx instanceof Response) return ctx;
    const body = await req.json().catch(() => ({})) as {
      source?: string;
      external_ref?: string | null;
      raw?: Record<string, unknown>;
      target_entity_type?: string | null;
      target_entity_id?: string | null;
    };
    if (!body.source || !ALLOWED_SOURCES.has(body.source)) {
      return jsonResponse({ error: "invalid_source" }, 400);
    }
    if (!body.raw || typeof body.raw !== "object") {
      return jsonResponse({ error: "raw_required" }, 400);
    }
    const actor = "userId" in ctx ? ctx.userId : null;
    const { data, error } = await ctx.service
      .from("data_enrichment_records")
      .insert({
        source_key: body.source,
        external_ref: body.external_ref ?? null,
        raw: body.raw,
        status: "imported",
        target_entity_type: body.target_entity_type ?? null,
        target_entity_id: body.target_entity_id ?? null,
        created_by: actor,
      })
      .select("id")
      .single();
    if (error) return jsonResponse({ error: "insert_failed", detail: error.message }, 200);
    await emitAudit(ctx.service, {
      record_id: (data as { id: string }).id,
      source_key: body.source,
      actor_id: actor,
      action: "enrichment_started",
      reason: "ingest",
    });
    return jsonResponse({ ok: true, record_id: (data as { id: string }).id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return jsonResponse({ ok: false, error: msg }, 200);
  }
});