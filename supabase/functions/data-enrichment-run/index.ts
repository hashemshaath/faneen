// DATA-ENRICHMENT-GOVERNANCE-1 — normalize, translate, score, detect conflicts.
// Reads the raw payload and writes back normalized/translated/confidence/
// conflicts/quality + advances status to `pending_review` (or `enriched` when
// the source.requires_review = false).
import { corsHeaders, jsonResponse, requireAdmin, emitAudit } from "../_shared/dataEnrichment/auth.ts";

type Field = string;
type Raw = Record<string, unknown>;

const FIELDS: Field[] = [
  "name_ar","name_en","description_ar","description_en",
  "activity_ar","activity_en",
  "phone","whatsapp","email","website",
  "city","district","street","national_address",
  "latitude","longitude","cr_number","vat_number",
  "social_facebook","social_instagram","social_twitter",
  "social_linkedin","social_youtube","social_tiktok",
];

function normalize(field: Field, v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  if (!s) return null;
  switch (field) {
    case "phone":
    case "whatsapp": {
      const d = s.replace(/[^\d+]/g, "");
      if (d.startsWith("+966")) return d;
      if (d.startsWith("00966")) return "+" + d.slice(2);
      if (d.startsWith("966")) return "+" + d;
      if (d.startsWith("05") && d.length === 10) return "+966" + d.slice(1);
      return d;
    }
    case "email": return s.toLowerCase();
    case "website": return s.toLowerCase().replace(/\/+$/, "");
    default: return s.replace(/\s+/g, " ");
  }
}

function scoreFor(source: string, agreeWith?: string): number {
  const weights: Record<string, number> = {
    google_places: 90, google_maps: 85, national_address: 95,
    firecrawl_website: 70, website_crawl: 65, manual_admin: 60,
    provider_registration: 75, supplier_import: 60, csv_import: 55,
    brand_import: 65, future_api: 50,
  };
  const base = weights[source] ?? 50;
  if (agreeWith && weights[agreeWith]) return Math.min(98, base + 6);
  return base;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ctx = await requireAdmin(req);
    if (ctx instanceof Response) return ctx;
    const { record_id } = await req.json().catch(() => ({})) as { record_id?: string };
    if (!record_id) return jsonResponse({ error: "record_id_required" }, 400);

    const { data: row, error: rowErr } = await ctx.service
      .from("data_enrichment_records").select("*").eq("id", record_id).single();
    if (rowErr || !row) return jsonResponse({ error: "record_not_found" }, 404);

    const raw = (row.raw as Raw) ?? {};
    const sourceKey = row.source_key as string;

    // Normalize
    const normalized: Record<string, string | null> = {};
    FIELDS.forEach((f) => { normalized[f] = normalize(f, raw[f]); });

    // Confidence (single-source path; cross-source path is for records
    // merged in resolve step)
    const confidence: Record<string, number> = {};
    FIELDS.forEach((f) => { if (normalized[f]) confidence[f] = scoreFor(sourceKey); });

    // Conflicts (only present when raw.merged_sources is provided)
    const conflicts: Array<{ field: string; values: Array<{ source: string; value: string | null; confidence: number }> }> = [];
    const merged = (raw.merged_sources as Record<string, Record<string, unknown>> | undefined);
    if (merged) {
      FIELDS.forEach((f) => {
        const vals = Object.entries(merged)
          .map(([s, payload]) => ({ source: s, value: normalize(f, (payload as Raw)[f]), confidence: scoreFor(s) }))
          .filter((v) => v.value != null);
        if (vals.length >= 2 && new Set(vals.map((v) => v.value)).size > 1) {
          conflicts.push({ field: f, values: vals });
        }
      });
    }

    // Translate missing language pairs via Lovable AI (deferred if no key)
    const translated: Record<string, string | null> = {};
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const pairs: Array<[string, string]> = [
      ["name_ar","name_en"],["description_ar","description_en"],["activity_ar","activity_en"],
    ];
    const missing: Array<{ from: string; to: string; value: string }> = [];
    pairs.forEach(([ar, en]) => {
      if (normalized[ar] && !normalized[en]) missing.push({ from: ar, to: en, value: normalized[ar]! });
      if (normalized[en] && !normalized[ar]) missing.push({ from: en, to: ar, value: normalized[en]! });
    });
    if (lovableKey && missing.length > 0) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${lovableKey}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Translate Arabic<->English business directory fields. Return strict JSON: { translations: { field_name: text } }. No markdown, no emojis." },
              { role: "user", content: JSON.stringify({ missing }) },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const content = data?.choices?.[0]?.message?.content ?? "{}";
          const parsed = JSON.parse(content) as { translations?: Record<string, string> };
          if (parsed.translations) {
            Object.entries(parsed.translations).forEach(([k, v]) => { translated[k] = String(v); });
          }
        }
      } catch { /* deferred */ }
    }

    // Quality
    const profile = ["name_ar","name_en","description_ar","description_en","activity_ar","activity_en"];
    const contact = ["phone","whatsapp","email","website"];
    const address = ["city","district","street","national_address","latitude","longitude"];
    const seo = ["description_ar","description_en","name_en"];
    const verification = ["cr_number","vat_number"];
    const pct = (fs: string[]) => Math.round((fs.filter((f) => !!normalized[f] || !!translated[f]).length / fs.length) * 100);
    const breakdown = {
      profile: pct(profile), contact: pct(contact), address: pct(address),
      seo: pct(seo), verification: pct(verification), enrichment: 100,
    };
    const quality_score = Math.round(
      breakdown.profile * 0.25 + breakdown.contact * 0.20 + breakdown.address * 0.20 +
      breakdown.seo * 0.15 + breakdown.verification * 0.10 + breakdown.enrichment * 0.10,
    );

    // Get source requires_review
    const { data: src } = await ctx.service
      .from("data_enrichment_sources").select("requires_review").eq("key", sourceKey).single();
    const requiresReview = (src as { requires_review?: boolean } | null)?.requires_review !== false;

    const nextStatus = conflicts.length > 0 || requiresReview ? "pending_review" : "enriched";

    const { error: updErr } = await ctx.service
      .from("data_enrichment_records")
      .update({
        normalized, translated, confidence,
        conflicts: conflicts, quality_score, status: nextStatus,
      })
      .eq("id", record_id);
    if (updErr) return jsonResponse({ error: "update_failed", detail: updErr.message }, 200);

    await emitAudit(ctx.service, {
      record_id, source_key: sourceKey, actor_id: ctx.userId,
      action: conflicts.length > 0 ? "conflict_detected" : "enrichment_completed",
      reason: nextStatus,
    });

    return jsonResponse({ ok: true, status: nextStatus, conflicts: conflicts.length, quality_score });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return jsonResponse({ ok: false, error: msg }, 200);
  }
});