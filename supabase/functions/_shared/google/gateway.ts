// GOOGLE-INTEGRATION-GOVERNANCE-AUDIT-1
// Shared gateway helper for all Google Maps Platform edge functions.
// Centralises secret access, header construction, error mapping, and
// best-effort usage logging so individual functions stay small.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type GoogleApi =
  | "places"
  | "geocoding"
  | "routes"
  | "address_validation"
  | "static_map";

// Direct Google hosts. We use a manually-managed server secret
// (GOOGLE_MAPS_API_KEY) and bypass the connector gateway entirely.
const GOOGLE_HOSTS: Array<{ prefix: string; host: string }> = [
  { prefix: "/places/",            host: "https://places.googleapis.com" },
  { prefix: "/addressvalidation/", host: "https://addressvalidation.googleapis.com" },
  { prefix: "/routes/",            host: "https://routes.googleapis.com" },
  { prefix: "/airquality/",        host: "https://airquality.googleapis.com" },
  { prefix: "/pollen/",            host: "https://pollen.googleapis.com" },
  { prefix: "/weather/",           host: "https://weather.googleapis.com" },
  { prefix: "/roads/",             host: "https://roads.googleapis.com" },
  { prefix: "/solar/",             host: "https://solar.googleapis.com" },
];
const DEFAULT_HOST = "https://maps.googleapis.com";

export function getGoogleSecrets(): {
  lovableKey: string | null;
  googleKey: string | null;
  missing: string[];
} {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY") ?? null;
  const googleKey = Deno.env.get("GOOGLE_MAPS_API_KEY") ?? null;
  const missing: string[] = [];
  if (!googleKey) missing.push("GOOGLE_MAPS_API_KEY");
  return { lovableKey, googleKey, missing };
}

export function googleHeaders(
  _lovableKey: string | null,
  googleKey: string,
  extra: Record<string, string> = {},
): HeadersInit {
  return {
    "X-Goog-Api-Key": googleKey,
    "Content-Type": "application/json",
    ...extra,
  };
}

export function gatewayUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  // For legacy `/maps/api/*` endpoints (Geocoding/StaticMaps), the API key
  // must be passed as a `key=` query param. `X-Goog-Api-Key` only works for
  // the modern REST APIs (Places New, Routes, Address Validation, ...).
  if (p.startsWith("/maps/")) {
    const googleKey = Deno.env.get("GOOGLE_MAPS_API_KEY") ?? "";
    const sep = p.includes("?") ? "&" : "?";
    return `${DEFAULT_HOST}${p}${sep}key=${encodeURIComponent(googleKey)}`;
  }
  const match = GOOGLE_HOSTS.find((h) => p.startsWith(h.prefix));
  if (match) {
    // Strip the connector-style prefix, keep the rest of the path.
    const rest = p.slice(match.prefix.length - 1); // keep leading "/"
    return `${match.host}${rest}`;
  }
  return `${DEFAULT_HOST}${p}`;
}

/**
 * Inspect a Google upstream error body and decide whether the 401/403
 * is caused by an HTTP-Referrer restriction on the server key.
 * Returns a stable machine code so the UI can render a precise hint.
 */
export function detectGoogleAuthIssue(status: number, bodyText: string): {
  code: "referrer_restricted" | "api_not_enabled" | "ip_blocked" | "key_invalid" | "unauthorized" | null;
  reason: string | null;
} {
  if (status !== 401 && status !== 403) return { code: null, reason: null };
  const body = (bodyText || "").toLowerCase();
  let reason: string | null = null;
  try {
    const j = JSON.parse(bodyText) as { error?: { message?: string; status?: string; details?: Array<{ reason?: string }> } };
    reason = j.error?.details?.find((d) => d.reason)?.reason
      ?? j.error?.status
      ?? (j.error?.message ? j.error.message.slice(0, 140) : null);
  } catch { /* fall through */ }
  if (/referer|referrer|http_referrer|request is from a referer/.test(body)) {
    return { code: "referrer_restricted", reason };
  }
  if (/api_key_service_blocked|api[\s_-]?not[\s_-]?enabled|service[\s_-]?disabled/.test(body)) {
    return { code: "api_not_enabled", reason };
  }
  if (/ip[\s_-]?address|ip_address_blocked/.test(body)) {
    return { code: "ip_blocked", reason };
  }
  if (/api[\s_-]?key.*(invalid|expired|not[\s_-]?found)|invalid[\s_-]?key/.test(body)) {
    return { code: "key_invalid", reason };
  }
  return { code: "unauthorized", reason };
}

/**
 * Sanitized server-side log for 401/403 from Google.
 * NEVER includes the API key; truncates the body snippet.
 */
export function logGoogleAuthFailure(api: GoogleApi, status: number, bodyText: string): {
  code: ReturnType<typeof detectGoogleAuthIssue>["code"];
  reason: string | null;
} {
  const { code, reason } = detectGoogleAuthIssue(status, bodyText);
  const snippet = (bodyText || "").replace(/AIza[0-9A-Za-z_\-]{20,}/g, "[REDACTED_KEY]").slice(0, 240);
  console.warn(JSON.stringify({
    scope: "google_gateway",
    event: "auth_failure",
    api,
    status,
    code: code ?? "unknown",
    reason: reason ?? null,
    bodySnippet: snippet,
    hint: code === "referrer_restricted"
      ? "Remove HTTP referrer restrictions from GOOGLE_MAPS_API_KEY (server key)."
      : code === "api_not_enabled"
      ? "Enable Places API New / Geocoding / Routes / Address Validation on the key's GCP project."
      : code === "ip_blocked"
      ? "Remove IP restrictions or allowlist Supabase Edge runtime egress."
      : code === "key_invalid"
      ? "Rotate GOOGLE_MAPS_API_KEY in Lovable Cloud secrets."
      : "Check GCP credentials and API restrictions.",
  }));
  return { code, reason };
}

/** Map an upstream HTTP status into a safe public error code. */
export function mapUpstreamError(
  status: number,
  bodySnippet: string,
): { code: string; status: number } {
  if (status === 401 || status === 403) return { code: "upstream_unauthorized", status: 502 };
  if (status === 429) return { code: "upstream_rate_limited", status: 429 };
  if (status === 400) return { code: "upstream_bad_request", status: 400 };
  if (status >= 500) return { code: "upstream_unavailable", status: 502 };
  // Best-effort: never leak the API key from body.
  if (/key|apikey|authorization/i.test(bodySnippet)) {
    return { code: "upstream_error", status: 502 };
  }
  return { code: "upstream_error", status: 502 };
}

/**
 * Best-effort write to google_api_usage_log. Never throws.
 */
export async function logGoogleApiUsage(
  api: GoogleApi,
  status: "ok" | "error",
  latencyMs: number,
  errorCode: string | null,
): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceRole) return;
    const admin = createClient(url, serviceRole);
    await admin.from("google_api_usage_log").insert({
      api,
      status,
      latency_ms: latencyMs,
      error_code: errorCode,
    });
  } catch {
    // never block on logging
  }
}

export const googleCorsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...googleCorsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Require an authenticated admin via has_admin_access RPC.
 * Returns null + a 401/403 Response when access is denied.
 */
export async function requireAdmin(req: Request): Promise<{ ok: true } | { ok: false; res: Response }> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const auth = req.headers.get("Authorization") ?? "";
    if (!url || !anon || !auth) {
      return { ok: false, res: jsonResponse({ error: "unauthorized" }, 401) };
    }
    const client = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: userRes, error: userErr } = await client.auth.getUser();
    const uid = userRes?.user?.id;
    if (userErr || !uid) {
      return { ok: false, res: jsonResponse({ error: "unauthorized" }, 401) };
    }
    const { data, error } = await client.rpc("has_admin_access", { _user_id: uid });
    if (error || data !== true) {
      return { ok: false, res: jsonResponse({ error: "forbidden" }, 403) };
    }
    return { ok: true };
  } catch {
    return { ok: false, res: jsonResponse({ error: "unauthorized" }, 401) };
  }
}