import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { EMAIL_BRAND as B } from "../_shared/brandTheme.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // Use raw SQL via RPC alternative — call the SECURITY DEFINER function as service role
    const { data, error } = await admin.rpc("get_contact_sla_weekly");
    if (error) throw error;

    const stats = data as Record<string, unknown>;
    const { data: settings } = await admin
      .from("contact_inbox_settings").select("weekly_report_recipients").eq("id", 1).maybeSingle();
    const fromSettings = ((settings?.weekly_report_recipients ?? []) as string[]).filter((e) => /\S+@\S+\.\S+/.test(e));
    const recipients = fromSettings.length > 0 ? fromSettings : [Deno.env.get("ADMIN_CONTACT_EMAIL") || "info@qitaat.com"];
    const thresholds = (stats.thresholds ?? {}) as Record<string, number>;
    const html = `<!doctype html><html><body style="font-family:system-ui;padding:24px;max-width:680px;margin:auto;line-height:1.6;color:${B.text}">
<h2>📊 تقرير SLA الأسبوعي · Weekly SLA Report</h2>
<p style="color:${B.muted}">${new Date(stats.window_start as string).toLocaleDateString()} → ${new Date(stats.window_end as string).toLocaleDateString()}</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
<tr><td style="padding:8px;border-bottom:1px solid ${B.border}"><b>إجمالي الرسائل · Total</b></td><td style="text-align:end">${stats.total} <small style="color:${B.muted}">(prev: ${stats.previous_total})</small></td></tr>
<tr><td style="padding:8px;border-bottom:1px solid ${B.border}"><b>تم الرد · Replied</b></td><td style="text-align:end">${stats.replied} (${stats.response_rate_pct}%)</td></tr>
<tr><td style="padding:8px;border-bottom:1px solid ${B.border}"><b>مغلقة · Closed</b></td><td style="text-align:end">${stats.closed} (${stats.closure_rate_pct}%)</td></tr>
<tr><td style="padding:8px;border-bottom:1px solid ${B.border}"><b>متوسط زمن الرد · Avg response</b></td><td style="text-align:end">${stats.avg_response_hours}h</td></tr>
<tr><td style="padding:8px;border-bottom:1px solid ${B.border}"><b>متوسط زمن الإغلاق · Avg resolution</b></td><td style="text-align:end">${stats.avg_resolution_hours}h</td></tr>
<tr><td style="padding:8px;border-bottom:1px solid ${B.border}"><b>التزام SLA الرد · Response within ${thresholds.target_response_hours ?? 24}h</b></td><td style="text-align:end;color:${B.success}"><b>${stats.sla_response_compliance_pct}%</b></td></tr>
<tr><td style="padding:8px;border-bottom:1px solid ${B.border}"><b>التزام الإغلاق · Resolution within ${thresholds.target_resolution_hours ?? 72}h</b></td><td style="text-align:end;color:${B.success}"><b>${stats.sla_resolution_compliance_pct}%</b></td></tr>
<tr><td style="padding:8px"><b>متأخرة مفتوحة · Stale open (> ${thresholds.stale_hours ?? 24}h)</b></td><td style="text-align:end;color:${B.warning}"><b>${stats.stale_open}</b></td></tr>
</table>
<p><a href="https://qitaat.com/admin/contact-messages" style="background:${B.primaryButton};color:${B.primaryButtonText};padding:10px 18px;border-radius:8px;text-decoration:none">فتح لوحة التحكم · Open dashboard</a></p>
</body></html>`;

    for (const to of recipients) {
      try {
        await admin.functions.invoke("send-transactional-email", {
          body: { to, subject: `📊 Qitaat — تقرير SLA الأسبوعي · Weekly SLA report`, html,
            template_name: "weekly-sla-report", skip_preferences: true },
        });
      } catch (_) { /* swallow */ }
    }

    return new Response(JSON.stringify({ ok: true, stats, recipients }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
