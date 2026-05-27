/**
 * BUSINESS-OPERATIONS-2U — Server-only edge entry point for the manual
 * SLA real-run harness.
 *
 * SAFETY CONTRACT (do NOT weaken):
 *   - POST only.
 *   - Authorization Bearer required and validated against Supabase Auth.
 *   - Caller MUST be admin / super_admin (via `has_admin_access` RPC).
 *   - `OPERATIONS_REAL_RUN_ENABLED === 'true'` required (env-gated).
 *   - Body MUST carry an explicit production approval, confirmation
 *     token, reason, `dryRun:false`, and `enableWrites:true`.
 *   - Notification writes are ALWAYS deferred — `enableNotificationWrites`
 *     is force-coerced to false. No SMS/email/push/WhatsApp imports.
 *   - The service-role Supabase client is constructed ONLY inside this
 *     function and is never exposed in the response or logs.
 *   - Response envelope contains NO PII, no recipient IDs, no raw rows,
 *     and no service-role secret material.
 *   - No cron / scheduler wiring. No UI execution surface.
 *
 * This endpoint is not registered with any client wrapper under
 * `src/modules/**` and is not callable from the browser. It is intended
 * for server-only / operator invocation (e.g. one-off `curl` from an
 * approved on-call workstation) once `OPERATIONS_REAL_RUN_ENABLED` is
 * explicitly enabled. Even then, every guard above must pass.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  invokeManualSlaRealRunHarness,
  createManualRunDependencyBundle,
  MANUAL_REAL_RUN_SCOPE,
  OPERATIONS_REAL_RUN_FLAG,
  NOTIFICATION_WRITES_DEFERRED_REASON,
} from "../../../src/modules/operations/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeRejection(reason: string, extra: Record<string, unknown> = {}) {
  return {
    accepted: false,
    reason,
    scope: MANUAL_REAL_RUN_SCOPE,
    notificationsDeferredReason: NOTIFICATION_WRITES_DEFERRED_REASON,
    ...extra,
  };
}

Deno.serve(async (req) => {
  // CORS preflight.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Method gate.
  if (req.method !== "POST") {
    return json(405, safeRejection("METHOD_NOT_ALLOWED"));
  }

  try {
    // Auth gate.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return json(401, safeRejection("AUTHORIZATION_REQUIRED"));
    }

    // Flag gate (env).
    const flag = Deno.env.get("OPERATIONS_REAL_RUN_ENABLED");
    if (flag !== "true") {
      return json(
        403,
        safeRejection("OPERATIONS_REAL_RUN_DISABLED", {
          flag: OPERATIONS_REAL_RUN_FLAG,
        }),
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json(500, safeRejection("SERVER_MISCONFIGURED"));
    }

    // Identify caller.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerData, error: callerError } =
      await callerClient.auth.getUser();
    if (callerError || !callerData?.user) {
      return json(401, safeRejection("UNAUTHORIZED"));
    }
    const caller = callerData.user;

    // Build server-only admin client.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Admin / super_admin gate.
    const { data: hasAccess, error: roleError } = await adminClient.rpc(
      "has_admin_access",
      { _user_id: caller.id },
    );
    if (roleError || !hasAccess) {
      return json(403, safeRejection("ADMIN_ROLE_REQUIRED"));
    }

    // Parse + validate body.
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json(400, safeRejection("INVALID_JSON"));
    }
    if (!body || typeof body !== "object") {
      return json(400, safeRejection("INVALID_BODY"));
    }

    const approval = body.approval as Record<string, unknown> | undefined;
    const approvalId =
      (body.approvalId as string | undefined) ??
      (approval?.approvalTicket as string | undefined);
    const confirmationToken = body.confirmationToken as string | undefined;
    const reason = body.reason as string | undefined;
    const dryRun = body.dryRun;
    const enableWrites = body.enableWrites;

    if (!approvalId || typeof approvalId !== "string") {
      return json(400, safeRejection("APPROVAL_ID_REQUIRED"));
    }
    if (!approval || typeof approval !== "object") {
      return json(400, safeRejection("APPROVAL_PAYLOAD_REQUIRED"));
    }
    if (!confirmationToken || typeof confirmationToken !== "string") {
      return json(400, safeRejection("CONFIRMATION_TOKEN_REQUIRED"));
    }
    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return json(400, safeRejection("REASON_REQUIRED"));
    }
    if (dryRun !== false) {
      return json(400, safeRejection("DRY_RUN_MUST_BE_FALSE"));
    }
    if (enableWrites !== true) {
      return json(400, safeRejection("ENABLE_WRITES_MUST_BE_TRUE"));
    }

    // Build dependency bundle from the server-only admin client.
    let bundle;
    try {
      bundle = createManualRunDependencyBundle({ supabaseAdmin: adminClient });
    } catch {
      return json(500, safeRejection("DEPENDENCY_BUNDLE_UNAVAILABLE"));
    }

    // Invoke the harness — notification writes are FORCED to deferred
    // regardless of caller intent.
    const result = await invokeManualSlaRealRunHarness({
      request: {
        requestedBy: caller.id,
        confirmationToken,
        reason,
        dryRun: false,
        enableWrites: true,
        enableNotificationWrites: false,
        approval: approval as never,
      },
      context: {
        executionContext: "server",
        role: "admin",
      },
      approval: approval as never,
      candidates: [],
      existingAlerts: [],
      alertWriter: bundle.alertWriter,
      preRunLogger: bundle.preRunLogger,
      postRunLogger: bundle.postRunLogger,
      auditWriter: bundle.auditWriter,
    });

    // Safe envelope — never include secrets, raw rows, or PII.
    return json(result.accepted ? 200 : 403, {
      accepted: result.accepted,
      reason: result.reason ?? null,
      requestId: result.requestId,
      scope: result.scope,
      executionSummary: result.executionSummary ?? null,
      notificationsDeferredReason: result.notificationsDeferredReason,
    });
  } catch {
    // Never leak raw error material to the client.
    return json(500, safeRejection("INTERNAL_ERROR"));
  }
});