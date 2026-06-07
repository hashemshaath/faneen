// ADMIN-DATA-ENRICHMENT-MICROSERVICE-1 — AI enhance / translate step.
// Takes a partial merged draft and asks the Lovable AI Gateway to:
//   - polish name + description in a professional, Qitaat-style tone
//   - produce paired ar/en versions when only one side is provided
//   - normalise district / street wording
// Returns ai_enhanced fields. Admin can accept per-field on the client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface EnhanceInput {
  name_ar?: string | null;
  name_en?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  district?: string | null;
  street?: string | null;
  city?: string | null;
  activity?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: isAdmin } = await sb.rpc("has_admin_access", {
      _user_id: user.id,
    });
    if (isAdmin !== true) return json({ error: "forbidden" }, 403);

    const lovableKey = Deno.env.get("LOVABLE_API_KEY") ?? "";
    if (!lovableKey) {
      return json({ ok: true, deferred: true, missing: ["LOVABLE_API_KEY"] });
    }

    const body = await req.json().catch(() => ({})) as EnhanceInput;

    // Fetch top-level categories so the AI can classify the business
    // into the existing taxonomy (prevents free-text duplicates).
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    let categoryOptions: Array<{ slug: string; name_ar: string; name_en: string }> = [];
    if (serviceKey) {
      const svc = createClient(supabaseUrl, serviceKey);
      const { data } = await svc
        .from("taxonomy_categories")
        .select("slug, name_ar, name_en, parent_id")
        .eq("is_active", true)
        .eq("is_public", true)
        .eq("is_archived", false)
        .or("show_in_seo.eq.true,show_in_search.eq.true")
        .is("parent_id", null);
      if (Array.isArray(data)) {
        categoryOptions = (data as Array<{ slug: string; name_ar: string; name_en: string }>).map((r) => ({
          slug: r.slug, name_ar: r.name_ar, name_en: r.name_en,
        }));
      }
    }

    const sys =
      "You are a bilingual editor + classifier for Qitaat (قِطاعات), a Saudi industrial directory. " +
      "Workflow: (1) Treat Arabic as the primary language — finalize Arabic first using the source inputs (do not invent facts). " +
      "(2) Translate the finalized Arabic into clean English. " +
      "(3) Classify the business into ONE category_slug from the provided category_options list (match by activity / name / description). " +
      "(4) Produce a short services list (3 to 7 items) that this kind of business typically offers, in both Arabic and English. " +
      "Return ONLY a strict JSON object with these keys: " +
      "name_ar, name_en, description_ar, description_en, district, street, category_slug, services_ar, services_en. " +
      "services_ar and services_en must be comma-separated strings. " +
      "Use clear, professional, factual tone. Arabic must be Modern Standard, no emojis, no markdown. " +
      "Trim names to <= 80 chars and descriptions to <= 280 chars. Normalize Saudi district / street wording. " +
      "If a value cannot be derived, return an empty string for it. " +
      "category_slug MUST be one of the slugs from category_options or an empty string if no good match.";

    const userMsg = JSON.stringify({
      input: body,
      category_options: categoryOptions,
      instructions:
        "Finalize Arabic first, then translate to English. Pick category_slug strictly from category_options. Generate practical services list per the category.",
    });

    const res = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${lovableKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: userMsg },
          ],
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!res.ok) {
      await res.text().catch(() => "");
      return json({ ok: true, ai_enhanced: {}, deferred: false });
    }
    const data = await res.json().catch(() => null);
    const content: string = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, string> = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {};
    }

    return json({ ok: true, ai_enhanced: parsed });
  } catch {
    return json({ ok: true, ai_enhanced: {} });
  }
});