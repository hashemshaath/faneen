import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { message_id } = await req.json();
    if (!message_id) {
      return new Response(JSON.stringify({ error: "message_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: { role: string }) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: msg, error: mErr } = await admin
      .from("contact_messages")
      .select("id, name, subject, message")
      .eq("id", message_id).maybeSingle();
    if (mErr || !msg) throw new Error(mErr?.message || "Message not found");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const sys = `You are a customer-support triage assistant for Qitaat (industrial directory: Aluminum, Glass, Wood, Steel, Iron). Analyze the contact message and return STRICT JSON only:
{
  "priority": "low|normal|high|urgent",
  "category": "sales|support|complaint|partnership|technical|billing|other",
  "summary": "1-sentence summary in Arabic AND English (format: AR · EN)",
  "suggested_reply_ar": "professional Arabic reply (3-6 sentences)",
  "suggested_reply_en": "professional English reply (3-6 sentences)",
  "confidence": 0.0-1.0
}
Use {name} placeholder for personalization. Be concise, professional, brand-aligned.`;
    const userPrompt = `Name: ${msg.name}\nSubject: ${msg.subject || "(none)"}\nMessage:\n${msg.message}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sys }, { role: "user", content: userPrompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI gateway: ${aiRes.status} ${t}`);
    }
    const aiData = await aiRes.json();
    const raw = aiData?.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);

    const reply = `${parsed.suggested_reply_ar || ""}\n\n---\n\n${parsed.suggested_reply_en || ""}`.trim();
    const allowed = ["low", "normal", "high", "urgent"];
    const priority = allowed.includes(parsed.priority) ? parsed.priority : "normal";

    const { error: uErr } = await admin
      .from("contact_messages")
      .update({
        ai_priority: priority,
        ai_category: String(parsed.category || "other").slice(0, 60),
        ai_summary: String(parsed.summary || "").slice(0, 500),
        ai_suggested_reply: reply.slice(0, 4000),
        ai_confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : null,
        ai_processed_at: new Date().toISOString(),
      })
      .eq("id", message_id);
    if (uErr) throw uErr;

    return new Response(JSON.stringify({ ok: true, ...parsed, priority }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
