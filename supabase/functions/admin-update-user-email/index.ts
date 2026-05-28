import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { logSecurityEvent, hashSubject, hashIp } from "../_shared/securityAudit.ts";

const jsonResponse = (body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ success: false, error: "Unauthorized", code: "unauthorized" });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const ipHash = await hashIp(req);
    const userAgent = req.headers.get("user-agent");

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsError || !claimsData?.claims?.sub) {
      await logSecurityEvent(supabaseAdmin, {
        event_type: "email_change",
        event_action: "failed",
        status: "warn",
        ip_hash: ipHash,
        user_agent: userAgent,
        reason: "unauthorized",
      });
      return jsonResponse({ success: false, error: "Unauthorized", code: "unauthorized" });
    }

    const callerId = claimsData.claims.sub as string;

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      await logSecurityEvent(supabaseAdmin, {
        event_type: "email_change",
        event_action: "failed",
        status: "error",
        user_id: callerId,
        ip_hash: ipHash,
        user_agent: userAgent,
        reason: "forbidden_not_super_admin",
      });
      return jsonResponse({ success: false, error: "Forbidden: super_admin required", code: "forbidden" });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse({ success: false, error: "Invalid JSON body", code: "invalid_json" });
    }
    const { target_user_id, new_email, auto_confirm } = body as {
      target_user_id?: unknown;
      new_email?: unknown;
      auto_confirm?: unknown;
    };

    if (typeof target_user_id !== "string" || typeof new_email !== "string") {
      return jsonResponse({ success: false, error: "target_user_id and new_email required", code: "invalid_request" });
    }

    const cleanEmail = new_email.trim().toLowerCase();
    if (!EMAIL_RE.test(cleanEmail) || cleanEmail.length > 254) {
      return jsonResponse({ success: false, error: "Invalid email format", code: "invalid_email" });
    }

    const targetHash = await hashSubject(target_user_id);
    await logSecurityEvent(supabaseAdmin, {
      event_type: "email_change",
      event_action: "attempt",
      user_id: callerId,
      subject_hash: targetHash,
      ip_hash: ipHash,
      user_agent: userAgent,
    });

    const confirm = auto_confirm !== false; // default true for admin updates
    const { data: updated, error } = await supabaseAdmin.auth.admin.updateUserById(target_user_id, {
      email: cleanEmail,
      email_confirm: confirm,
    });

    if (error) {
      const message = (error.message || "").toLowerCase();
      const code = message.includes("already") || message.includes("registered")
        ? "email_already_in_use"
        : "auth_update_failed";
      await logSecurityEvent(supabaseAdmin, {
        event_type: "email_change",
        event_action: "failed",
        status: "error",
        user_id: callerId,
        subject_hash: targetHash,
        ip_hash: ipHash,
        reason: code,
      });
      return jsonResponse({ success: false, error: error.message, code });
    }

    // Mirror to profiles.email for display parity (best effort)
    await supabaseAdmin
      .from("profiles")
      .update({ email: cleanEmail })
      .eq("user_id", target_user_id);

    await logSecurityEvent(supabaseAdmin, {
      event_type: "email_change",
      event_action: "success",
      user_id: callerId,
      subject_hash: targetHash,
      ip_hash: ipHash,
      user_agent: userAgent,
      reason: "email_updated",
    });

    return jsonResponse({ success: true, email: updated?.user?.email ?? cleanEmail });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return jsonResponse({ success: false, error: message, code: "unexpected_error" });
  }
});