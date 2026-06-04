// ADMIN-DATA-ENRICHMENT — cache clear.
// Admin-only. Deletes cached Google Maps + Firecrawl enrichment payloads
// from public.admin_enrichment_cache. Supports optional `scope` filter:
//   - "search" deletes only search:* keys
//   - "web"    deletes only web:* keys (Firecrawl)
//   - "maps"   deletes only maps:* keys (Google Maps)
//   - "all" (default) deletes everything in the table

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: isAdmin } = await sb.rpc("has_admin_access", { _user_id: user.id });
    if (isAdmin !== true) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({})) as { scope?: string };
    const scope = ["search", "web", "maps", "all"].includes(body.scope ?? "")
      ? (body.scope as "search" | "web" | "maps" | "all")
      : "all";

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!serviceKey) return json({ error: "service_key_missing" }, 200);
    const svc = createClient(supabaseUrl, serviceKey);

    let q = svc.from("admin_enrichment_cache").delete();
    if (scope === "all") {
      q = q.gte("created_at", "1970-01-01");
    } else {
      q = q.like("cache_key", `${scope}:%`);
    }
    const { error, count } = await q.select("cache_key", { count: "exact", head: true });
    if (error) return json({ ok: false, error: "delete_failed" }, 200);
    return json({ ok: true, deleted: count ?? 0, scope });
  } catch {
    return json({ error: "internal_error" }, 200);
  }
});