/**
 * A/B experiment evaluator.
 * Calls public.ab_evaluate_experiments() to score running experiments and
 * auto-promote any that have reached significance with auto_promote=true.
 *
 * Auth model (mirrors monthly-provider-credit-grant):
 *   - Cron path: header `x-cron-secret: <CRON_SECRET>`
 *   - Admin path: bearer JWT belonging to a super_admin user
 * No body is required.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

function json(body: unknown, status = 200) {
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
    const cronHeader = req.headers.get("x-cron-secret") ?? "";
    const isCron = !!CRON_SECRET && cronHeader === CRON_SECRET;

    let isAdmin = false;
    if (!isCron) {
      const auth = req.headers.get("Authorization") ?? "";
      if (auth.startsWith("Bearer ")) {
        const token = auth.slice(7);
        const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: user } = await userClient.auth.getUser(token);
        if (user?.user?.id) {
          const { data: roleRow } = await userClient
            .from("user_roles")
            .select("role")
            .eq("user_id", user.user.id)
            .eq("role", "super_admin")
            .maybeSingle();
          isAdmin = !!roleRow;
        }
      }
    }

    if (!isCron && !isAdmin) {
      return json({ success: false, error: "unauthorized" }, 200);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data, error } = await admin.rpc("ab_evaluate_experiments");
    if (error) {
      return json({ success: false, error: error.message }, 200);
    }
    return json({ success: true, result: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return json({ success: false, error: msg }, 200);
  }
});