import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const ok = (b: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return ok({ ok: false, error: "auth_required" }, 401);
    const token = auth.slice(7);

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return ok({ ok: false, error: "auth_required" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles ?? []).some((r) => ["super_admin", "admin"].includes(r.role as string));
    if (!isAdmin) return ok({ ok: false, error: "forbidden" }, 403);

    let body: { override_url?: string; override_secret?: string } = {};
    try { body = await req.json(); } catch { /* empty */ }

    const { data: settings } = await admin.from("contact_inbox_settings").select("webhook_url, webhook_secret").eq("id", 1).maybeSingle();
    const url = body.override_url || (settings?.webhook_url as string | null) || "";
    const secret = body.override_secret ?? (settings?.webhook_secret as string | null) ?? null;
    if (!url) return ok({ ok: false, error: "webhook_url_not_set" });

    const samplePayload = {
      event_type: "test_event",
      from: null,
      to: "test",
      actor_id: user.id,
      message: {
        id: "00000000-0000-0000-0000-000000000000",
        ticket_number: "TKT-TEST",
        name: "Test Sender",
        email: "test@example.com",
        subject: "Test webhook payload",
        status: "new",
        priority: "normal",
        assigned_to: null,
        created_at: new Date().toISOString(),
      },
      dashboard_url: "https://qitaat.com/admin/contact-messages",
      sent_at: new Date().toISOString(),
      _test: true,
    };

    const startedAt = Date.now();
    let httpStatus: number | null = null;
    let respBody = "";
    let success = false;
    let err: string | null = null;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { "X-Qitaat-Signature": secret } : {}),
        },
        body: JSON.stringify(samplePayload),
      });
      httpStatus = res.status;
      respBody = (await res.text()).slice(0, 4000);
      success = res.ok;
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    }

    return ok({
      ok: success,
      url,
      payload: samplePayload,
      http_status: httpStatus,
      response_body: respBody,
      error: err,
      duration_ms: Date.now() - startedAt,
    });
  } catch (e) {
    return ok({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});
