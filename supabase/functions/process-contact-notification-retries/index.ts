import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LogRow {
  id: string;
  message_id: string;
  event_id: string | null;
  event_type: string | null;
  channel: "email" | "webhook";
  recipient: string;
  attempt_count: number;
  max_attempts: number;
  request_payload: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const ok = (b: Record<string, unknown>) =>
    new Response(JSON.stringify(b), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: settingsRow } = await admin
      .from("contact_inbox_settings").select("*").eq("id", 1).maybeSingle();
    const s = (settingsRow ?? {}) as Record<string, unknown>;
    const backoff = (s.retry_backoff_seconds as number) ?? 60;
    const maxAttempts = (s.max_notification_attempts as number) ?? 5;
    const webhookSecret = (s.webhook_secret as string | null) ?? null;

    const { data: rows, error } = await admin
      .from("contact_notification_log")
      .select("id, message_id, event_id, event_type, channel, recipient, attempt_count, max_attempts, request_payload")
      .eq("status", "pending")
      .lte("next_retry_at", new Date().toISOString())
      .order("next_retry_at", { ascending: true })
      .limit(50);
    if (error) throw error;

    const dueRows = (rows ?? []) as LogRow[];
    let processed = 0, succeeded = 0, exhausted = 0;
    const exhaustedDetails: Array<{ id: string; channel: string; recipient: string; error_message: string | null }> = [];

    for (const row of dueRows) {
      processed++;
      const nextAttempt = row.attempt_count + 1;
      let success = false;
      let httpStatus: number | null = null;
      let errCode: string | null = null;
      let errMsg: string | null = null;
      let respBody: string | null = null;

      try {
        if (row.channel === "webhook") {
          const url = row.recipient;
          if (!url) throw new Error("missing_webhook_url");
          const res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(webhookSecret ? { "X-Qitaat-Signature": webhookSecret } : {}),
            },
            body: JSON.stringify(row.request_payload ?? {}),
          });
          respBody = (await res.text()).slice(0, 2000);
          httpStatus = res.status;
          success = res.ok;
          if (!success) { errCode = `HTTP_${res.status}`; errMsg = respBody.slice(0, 500); }
        } else {
          const { error: invErr } = await admin.functions.invoke("send-transactional-email", { body: row.request_payload });
          success = !invErr;
          if (invErr) { errCode = "EMAIL_DISPATCH_ERROR"; errMsg = invErr.message ?? String(invErr); }
        }
      } catch (e) {
        errCode = "NETWORK_ERROR";
        errMsg = e instanceof Error ? e.message : String(e);
      }

      const reachedMax = nextAttempt >= (row.max_attempts ?? maxAttempts);
      const newStatus = success ? "success" : (reachedMax ? "max_retries" : "pending");
      const nextRetry = success || reachedMax ? null : new Date(Date.now() + backoff * Math.pow(2, nextAttempt - 1) * 1000).toISOString();

      await admin.from("contact_notification_log").update({
        status: newStatus,
        attempt_count: nextAttempt,
        http_status: httpStatus,
        error_code: errCode,
        error_message: errMsg,
        response_body: respBody,
        last_attempt_at: new Date().toISOString(),
        next_retry_at: nextRetry,
      }).eq("id", row.id);

      if (success) succeeded++;
      if (newStatus === "max_retries") {
        exhausted++;
        exhaustedDetails.push({ id: row.id, channel: row.channel, recipient: row.recipient, error_message: errMsg });
      }
    }

    if (exhausted > 0 && (s.alert_on_max_retries as boolean) !== false) {
      const recipients = (((s.alert_recipients as string[]) ?? []).filter((e) => /\S+@\S+\.\S+/.test(e)));
      if (recipients.length === 0) recipients.push(Deno.env.get("ADMIN_CONTACT_EMAIL") || "info@qitaat.com");
      const items = exhaustedDetails.map((d) =>
        `<li><b>${d.channel}</b> → <code>${B.error}">${(d.error_message ?? "").slice(0, 200)}</code></li>`.replace('${B.error}">', `${B.error};">`).replace('<code>', '<code><small style="color:').replace('</code></li>', '</small></li>')
      ).join("");
      const html = `<!doctype html><html><body style="font-family:system-ui;padding:24px;max-width:560px;margin:auto">
<h2 style="color:#b91c1c">⚠️ Notification delivery exhausted</h2>
<p>${exhausted} notification(s) reached max retries (${maxAttempts}).</p>
<ul>${items}</ul>
<p><a href="https://qitaat.com/admin/contact-notification-log" style="background:#0ea5e9;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Open log</a></p>
</body></html>`;
      for (const to of recipients) {
        try {
          await admin.functions.invoke("send-transactional-email", {
            body: { to, subject: `⚠️ Qitaat — Notification delivery exhausted (${exhausted})`, html,
              template_name: "contact-notification-exhausted", skip_preferences: true },
          });
        } catch (_) { /* swallow */ }
      }
    }

    return ok({ ok: true, processed, succeeded, exhausted });
  } catch (e) {
    return ok({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});
