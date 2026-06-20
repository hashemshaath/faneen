import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface SendRequest {
  opportunity_id?: string;
  opportunity_ref: string;
  event_type: string;
  recipient_role: "client" | "provider" | "admin";
  recipient_user_id?: string;
  recipient_phone: string; // E.164, e.g. +9665XXXXXXXX
  language: "ar" | "en";
  body: string;
  channel?: "whatsapp" | "sms";
}

const META_TOKEN = Deno.env.get("META_WHATSAPP_TOKEN");
const META_PHONE_ID = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/[\s\-()]/g, "");
  if (!/^\+?\d{8,15}$/.test(trimmed)) return null;
  return trimmed.startsWith("+") ? trimmed.slice(1) : trimmed;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  let payload: SendRequest;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }

  const {
    opportunity_id, opportunity_ref, event_type, recipient_role,
    recipient_user_id, recipient_phone, language, body,
    channel = "whatsapp",
  } = payload || ({} as SendRequest);

  if (!opportunity_ref || !event_type || !recipient_role || !recipient_phone || !language || !body) {
    return jsonResponse({ ok: false, error: "missing_fields" }, 400);
  }

  const phone = normalizePhone(recipient_phone);
  const baseLog = {
    opportunity_id: opportunity_id ?? null,
    opportunity_ref,
    event_type,
    recipient_role,
    recipient_user_id: recipient_user_id ?? null,
    recipient_phone: phone,
    channel,
    language,
    body,
    provider: channel === "whatsapp" ? "meta_whatsapp_cloud" : "gatewayapi",
  };

  if (!phone) {
    await admin.from("opportunity_message_send_log").insert({
      ...baseLog, status: "skipped", error_message: "invalid_phone",
    });
    return jsonResponse({ ok: false, error: "invalid_phone" }, 200);
  }

  // SMS path is not wired yet — log + skip so audit trail exists.
  if (channel !== "whatsapp") {
    await admin.from("opportunity_message_send_log").insert({
      ...baseLog, status: "skipped", error_message: "sms_provider_not_wired",
    });
    return jsonResponse({ ok: true, skipped: true, reason: "sms_provider_not_wired" });
  }

  if (!META_TOKEN || !META_PHONE_ID) {
    await admin.from("opportunity_message_send_log").insert({
      ...baseLog, status: "skipped", error_message: "whatsapp_not_configured",
    });
    return jsonResponse({ ok: false, error: "whatsapp_not_configured" }, 200);
  }

  // Send via Meta WhatsApp Cloud API as a free-form text message
  // (works within 24h customer-service window; otherwise an approved
  // template must be used).
  const url = `https://graph.facebook.com/v20.0/${META_PHONE_ID}/messages`;
  let providerResponse: unknown = null;
  let providerMessageId: string | null = null;
  let status: "sent" | "failed" = "failed";
  let errorMessage: string | null = null;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${META_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body },
      }),
    });
    providerResponse = await resp.json().catch(() => ({}));
    if (resp.ok) {
      status = "sent";
      const r = providerResponse as { messages?: Array<{ id?: string }> };
      providerMessageId = r.messages?.[0]?.id ?? null;
    } else {
      errorMessage = `http_${resp.status}`;
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "network_error";
  }

  await admin.from("opportunity_message_send_log").insert({
    ...baseLog,
    status,
    provider_message_id: providerMessageId,
    provider_response: providerResponse,
    error_message: errorMessage,
  });

  return jsonResponse({ ok: status === "sent", status, provider_message_id: providerMessageId, error: errorMessage });
});