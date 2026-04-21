import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1) Load config
    const { data: config, error: cfgErr } = await supabase
      .from("migration_alert_config")
      .select(
        "enabled, failure_rate_threshold, min_sample_size, cooldown_hours, notify_emails, evaluation_window_hours",
      )
      .eq("id", 1)
      .maybeSingle();

    if (cfgErr) throw new Error(`config load: ${cfgErr.message}`);
    if (!config?.enabled) {
      return json({ ok: true, skipped: "alerts disabled" });
    }

    const threshold = Number(config.failure_rate_threshold ?? 25);
    const minSample = Number(config.min_sample_size ?? 20);
    const cooldownH = Number(config.cooldown_hours ?? 6);
    // New: configurable evaluation window. Defaults to 6h per requirement —
    // detect spikes faster than the legacy 24h baseline.
    const windowHours = Math.max(1, Math.min(168, Number(config.evaluation_window_hours ?? 6)));

    // 2) Compute failure stats over the configured window
    const { data: stats, error: stErr } = await supabase
      .rpc("get_migration_failure_stats_window", { _hours: windowHours });
    if (stErr) throw new Error(`stats: ${stErr.message}`);

    const row = Array.isArray(stats) ? stats[0] : stats;
    const total = Number(row?.total_events ?? 0);
    const failed = Number(row?.failed_events ?? 0);
    const failureRate = Number(row?.failure_rate ?? 0);

    if (total < minSample) {
      return json({ ok: true, skipped: "below min sample", total, minSample, windowHours });
    }
    if (failureRate < threshold) {
      return json({ ok: true, skipped: "below threshold", failureRate, threshold, windowHours });
    }

    // 3) Cooldown — skip if we already alerted recently
    const { data: lastAlert } = await supabase
      .from("migration_alerts_sent")
      .select("sent_at")
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastAlert?.sent_at) {
      const ageHours = (Date.now() - new Date(lastAlert.sent_at).getTime()) / 3600_000;
      if (ageHours < cooldownH) {
        return json({ ok: true, skipped: "cooldown active", ageHours, cooldownH });
      }
    }

    // 4) Resolve recipients: explicit list OR all admins
    let recipients: string[] = (config.notify_emails ?? []).filter(Boolean);
    if (recipients.length === 0) {
      const { data: admins } = await supabase.rpc("get_admin_emails").catch(() => ({ data: null as any }));
      if (Array.isArray(admins)) recipients = admins.filter(Boolean);
      // Fallback: query profiles + user_roles
      if (recipients.length === 0) {
        const { data: roleRows } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("role", ["admin", "super_admin"]);
        const ids = (roleRows ?? []).map((r: any) => r.user_id).filter(Boolean);
        if (ids.length > 0) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("login_email, email")
            .in("id", ids);
          recipients = (profs ?? [])
            .map((p: any) => p.login_email || p.email)
            .filter((e: string | null): e is string => !!e);
        }
      }
    }
    recipients = Array.from(new Set(recipients));

    if (recipients.length === 0) {
      return json({ ok: false, error: "no admin recipients found", failureRate, total });
    }

    // 5) Send one email per recipient via send-transactional-email
    const reportUrl = `${Deno.env.get("PUBLIC_SITE_URL") || "https://qitaat.lovable.app"}/admin/migration-report`;
    const sendResults: Array<{ to: string; ok: boolean; error?: string }> = [];

    for (const to of recipients) {
      try {
        const { error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "migration-failure-alert",
            recipientEmail: to,
            idempotencyKey: `mig-alert-${new Date().toISOString().slice(0, 13)}-${to}`,
            templateData: {
              failureRate,
              threshold,
              totalEvents: total,
              failedEvents: failed,
              windowHours,
              reportUrl,
            },
          },
        });
        sendResults.push({ to, ok: !sendErr, error: sendErr?.message });
      } catch (e: any) {
        sendResults.push({ to, ok: false, error: e?.message || String(e) });
      }
    }

    // 6) Log the alert
    await supabase.from("migration_alerts_sent").insert({
      failure_rate: failureRate,
      total_events: total,
      failed_events: failed,
      threshold,
      recipients,
      channel: "email",
      details: { sendResults, windowHours },
    });

    return json({
      ok: true,
      alerted: true,
      failureRate,
      threshold,
      windowHours,
      total,
      failed,
      recipients,
      sendResults,
    });
  } catch (error: any) {
    console.error("[check-migration-alerts] error:", error);
    return json({ ok: false, error: error?.message || String(error) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
