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

    const sys =
      "You are a bilingual editor for Qitaat (قِطاعات), an industrial directory in Saudi Arabia (Aluminum, Glass, Wood, Steel, UPVC). " +
      "Return ONLY a strict JSON object with these keys: name_ar, name_en, description_ar, description_en, district, street. " +
      "Use clear, professional, factual tone. Do not invent facts. If a field cannot be derived, return an empty string for it. " +
      "Arabic must be Modern Standard, no emojis, no markdown.";

    const userMsg = JSON.stringify({
      input: body,
      instructions:
        "Translate or improve. Make ar/en parallel. Trim names to <= 80 chars, descriptions to <= 280 chars. Normalize Saudi district/street wording.",
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