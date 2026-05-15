import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { logSecurityEvent, hashSubject, hashIp } from "../_shared/securityAudit.ts";

const jsonResponse = (body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isWeakPasswordError = (message: string) => {
  const normalized = message.toLowerCase();
  return normalized.includes("weak") || normalized.includes("easy to guess") || normalized.includes("password");
};

const getPasswordValidationError = (password: unknown) => {
  if (typeof password !== "string") return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (/\s/.test(password)) return "Password must not contain spaces";
  const categoryCount = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9\s]/].filter((rule) => rule.test(password)).length;
  if (categoryCount < 3) return "Password must include at least three of: uppercase letters, lowercase letters, numbers, symbols";
  const lower = password.toLowerCase();
  if (["password", "qwerty", "admin", "123456", "qitaat"].some((word) => lower.includes(word))) {
    return "Password contains a common word or pattern";
  }
  return null;
};

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
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const ipHash = await hashIp(req);
    const userAgent = req.headers.get("user-agent");

    // Verify caller is super_admin
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims?.sub) {
      await logSecurityEvent(supabaseAdmin, {
        event_type: "password_reset",
        event_action: "failed",
        status: "warn",
        ip_hash: ipHash,
        user_agent: userAgent,
        reason: "unauthorized",
      });
      return jsonResponse({ success: false, error: "Unauthorized", code: "unauthorized" });
    }

    const callerId = claimsData.claims.sub;

    // Check super_admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      await logSecurityEvent(supabaseAdmin, {
        event_type: "password_reset",
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
    const { target_user_id, action, new_password } = body;

    if (typeof target_user_id !== "string" || typeof action !== "string") {
      return jsonResponse({ success: false, error: "target_user_id and action required", code: "invalid_request" });
    }
    const targetHash = await hashSubject(target_user_id);
    await logSecurityEvent(supabaseAdmin, {
      event_type: "password_reset",
      event_action: "attempt",
      user_id: callerId,
      subject_hash: targetHash,
      ip_hash: ipHash,
      user_agent: userAgent,
      metadata: { action },
    });

    if (action === "change_password") {
      const validationError = getPasswordValidationError(new_password);
      if (validationError) {
        await logSecurityEvent(supabaseAdmin, {
          event_type: "password_reset",
          event_action: "failed",
          status: "warn",
          user_id: callerId,
          subject_hash: targetHash,
          ip_hash: ipHash,
          reason: "weak_password",
          metadata: { action },
        });
        return jsonResponse({ success: false, error: validationError, code: "weak_password" });
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(target_user_id, {
        password: new_password,
      });

      if (error) {
        const message = error.message || "Failed to update password";
        await logSecurityEvent(supabaseAdmin, {
          event_type: "password_reset",
          event_action: "failed",
          status: "error",
          user_id: callerId,
          subject_hash: targetHash,
          ip_hash: ipHash,
          reason: isWeakPasswordError(message) ? "weak_password" : "auth_update_failed",
          metadata: { action },
        });
        return jsonResponse({
          success: false,
          error: isWeakPasswordError(message) ? "Password is too weak or easy to guess. Choose a longer, unique password." : message,
          code: isWeakPasswordError(message) ? "weak_password" : "auth_update_failed",
        });
      }

      await logSecurityEvent(supabaseAdmin, {
        event_type: "password_reset",
        event_action: "success",
        user_id: callerId,
        subject_hash: targetHash,
        ip_hash: ipHash,
        user_agent: userAgent,
        reason: "password_changed",
        metadata: { action },
      });
      return jsonResponse({ success: true, message: "Password changed" });
    }

    if (action === "send_reset_link") {
      // Get user email
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(target_user_id);
      if (userError || !userData?.user?.email) {
        await logSecurityEvent(supabaseAdmin, {
          event_type: "password_reset",
          event_action: "failed",
          status: "warn",
          user_id: callerId,
          subject_hash: targetHash,
          ip_hash: ipHash,
          reason: "email_not_found",
          metadata: { action },
        });
        return jsonResponse({ success: false, error: "User email not found", code: "email_not_found" });
      }

      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(userData.user.email);
      if (error) {
        await logSecurityEvent(supabaseAdmin, {
          event_type: "password_reset",
          event_action: "failed",
          status: "error",
          user_id: callerId,
          subject_hash: targetHash,
          ip_hash: ipHash,
          reason: "reset_link_failed",
          metadata: { action },
        });
        return jsonResponse({ success: false, error: error.message, code: "reset_link_failed" });
      }

      await logSecurityEvent(supabaseAdmin, {
        event_type: "password_reset",
        event_action: "success",
        user_id: callerId,
        subject_hash: targetHash,
        ip_hash: ipHash,
        user_agent: userAgent,
        reason: "reset_link_sent",
        metadata: { action },
      });
      return jsonResponse({ success: true, message: "Reset link sent" });
    }

    return jsonResponse({ success: false, error: "Invalid action", code: "invalid_action" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";

    return jsonResponse({ success: false, error: message, code: "unexpected_error" });
  }
});
