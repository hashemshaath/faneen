import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EventPayload {
  event_id?: string;
  message_id: string;
  event_type: string; // status_changed | assignee_changed | priority_changed | ai_triaged | created
  from_value?: string | null;
  to_value?: string | null;
  actor_id?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ok = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const payload = (await req.json()) as EventPayload;
    if (!payload?.message_id || !payload?.event_type) {
      return ok({ ok: false, error: "missing_fields" });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Settings
    const { data: settingsRow } = await admin
      .from("contact_inbox_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    const s = settingsRow ?? {};

    const channelKey = (() => {
      switch (payload.event_type) {
        case "assignee_changed": return { email: "notify_email_on_assign", webhook: "notify_webhook_on_assign" };
        case "status_changed":   return { email: "notify_email_on_status_change", webhook: "notify_webhook_on_status_change" };
        case "priority_changed": return { email: "notify_email_on_priority_change", webhook: "notify_webhook_on_priority_change" };
        default: return { email: "notify_email_on_status_change", webhook: "notify_webhook_on_status_change" };
      }
    })();
    const wantEmail = !!(s as Record<string, unknown>)[channelKey.email];
    const wantWebhook = !!(s as Record<string, unknown>)[channelKey.webhook];

    if (!wantEmail && !wantWebhook) return ok({ ok: true, skipped: "channels_off" });

    // 2. Message context
    const { data: msg } = await admin
      .from("contact_messages")
      .select("id, ticket_number, name, email, subject, message, status, priority, assigned_to, created_at")
      .eq("id", payload.message_id)
      .maybeSingle();
    if (!msg) return ok({ ok: false, error: "message_not_found" });

    const dashboardUrl = `https://qitaat.com/admin/contact-messages?id=${msg.id}`;

    // 3. Webhook
    if (wantWebhook && (s as Record<string, unknown>).webhook_url) {
      const url = (s as Record<string, string>).webhook_url;
      const secret = (s as Record<string, string | null>).webhook_secret;
      try {
        await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(secret ? { "X-Qitaat-Signature": secret } : {}),
          },
          body: JSON.stringify({
            event_type: payload.event_type,
            from: payload.from_value ?? null,
            to: payload.to_value ?? null,
            actor_id: payload.actor_id ?? null,
            message: {
              id: msg.id,
              ticket_number: msg.ticket_number,
              name: msg.name,
              email: msg.email,
              subject: msg.subject,
              status: msg.status,
              priority: msg.priority,
              assigned_to: msg.assigned_to,
              created_at: msg.created_at,
            },
            dashboard_url: dashboardUrl,
            sent_at: new Date().toISOString(),
          }),
        });
      } catch (_) { /* silent */ }
    }

    // 4. Email subscribers (admins matching role_subscriptions, not muted)
    if (wantEmail) {
      const subs = ((s as Record<string, unknown>).role_subscriptions ?? {}) as Record<string, string[]>;
      const subscribedRoles = Object.entries(subs)
        .filter(([, evts]) => Array.isArray(evts) && evts.includes(payload.event_type))
        .map(([role]) => role);

      const muted = ((s as Record<string, unknown>).muted_user_ids ?? []) as string[];

      // Get user ids with subscribed roles
      let recipientEmails: string[] = [];
      if (subscribedRoles.length > 0) {
        const { data: roleRows } = await admin
          .from("user_roles")
          .select("user_id, role")
          .in("role", subscribedRoles);
        const userIds = (roleRows ?? [])
          .map((r) => r.user_id as string)
          .filter((id) => !muted.includes(id));
        if (userIds.length > 0) {
          const { data: profiles } = await admin
            .from("profiles")
            .select("user_id, email")
            .in("user_id", userIds);
          recipientEmails = (profiles ?? [])
            .map((p) => (p.email ?? "") as string)
            .filter((e) => /\S+@\S+\.\S+/.test(e));
        }
      }

      // Always include the assignee on assign events
      if (payload.event_type === "assignee_changed" && payload.to_value) {
        const { data: assigneeProfile } = await admin
          .from("profiles")
          .select("email")
          .eq("user_id", payload.to_value)
          .maybeSingle();
        const aEmail = (assigneeProfile?.email ?? "") as string;
        if (/\S+@\S+\.\S+/.test(aEmail) && !muted.includes(payload.to_value) && !recipientEmails.includes(aEmail)) {
          recipientEmails.push(aEmail);
        }
      }

      const labelMap: Record<string, { ar: string; en: string }> = {
        status_changed:   { ar: "تغيّرت حالة الرسالة", en: "Ticket status changed" },
        assignee_changed: { ar: "تم تعيين الرسالة",     en: "Ticket reassigned" },
        priority_changed: { ar: "تغيّرت أولوية الرسالة", en: "Ticket priority changed" },
        ai_triaged:       { ar: "فرز ذكي للرسالة",      en: "AI triage applied" },
      };
      const lbl = labelMap[payload.event_type] ?? { ar: payload.event_type, en: payload.event_type };

      const html = `<!doctype html><html><body style="font-family:system-ui;padding:24px;max-width:560px;margin:auto;line-height:1.6;color:#1e293b">
<h2 style="margin:0 0 8px">🔔 ${lbl.en} · ${lbl.ar}</h2>
<p style="color:#64748b;margin:0 0 16px">${msg.ticket_number ?? msg.id} — ${msg.name}</p>
<table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden">
  <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0"><b>${lbl.en}</b></td><td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:end">${payload.from_value ?? "—"} → <b>${payload.to_value ?? "—"}</b></td></tr>
  <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0">Subject</td><td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:end">${(msg.subject ?? "").toString().slice(0, 80) || "—"}</td></tr>
  <tr><td style="padding:10px;border-bottom:1px solid #e2e8f0">Priority</td><td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:end">${msg.priority}</td></tr>
  <tr><td style="padding:10px">Status</td><td style="padding:10px;text-align:end">${msg.status}</td></tr>
</table>
<p style="margin:20px 0"><a href="${dashboardUrl}" style="background:#0ea5e9;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Open ticket</a></p>
<p style="font-size:12px;color:#94a3b8">You receive this because your role is subscribed to "${payload.event_type}". Mute notifications from /dashboard/communication-preferences.</p>
</body></html>`;

      for (const to of recipientEmails) {
        try {
          await admin.functions.invoke("send-transactional-email", {
            body: {
              to,
              subject: `🔔 ${lbl.en} — ${msg.ticket_number ?? msg.name}`,
              html,
              template_name: `contact-event-${payload.event_type}`,
              skip_preferences: true,
            },
          });
        } catch (_) { /* swallow per-recipient */ }
      }
    }

    return ok({ ok: true });
  } catch (e) {
    return ok({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});