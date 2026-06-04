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

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";
const DEFAULT_GOOGLE_REFERER = "https://qitaat.lovable.app/";

export function getGoogleSecrets(): {
  lovableKey: string | null;
  googleKey: string | null;
  missing: string[];
} {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY") ?? null;
  const googleKey = Deno.env.get("GOOGLE_MAPS_API_KEY") ?? null;
  const missing: string[] = [];
  if (!lovableKey) missing.push("LOVABLE_API_KEY");
  if (!googleKey) missing.push("GOOGLE_MAPS_API_KEY");
  return { lovableKey, googleKey, missing };
}

export function googleHeaders(
  lovableKey: string,
  googleKey: string,
  extra: Record<string, string> = {},
): HeadersInit {
  const referer = Deno.env.get("GOOGLE_MAPS_HTTP_REFERER") ?? DEFAULT_GOOGLE_REFERER;
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": googleKey,
    "Content-Type": "application/json",
    Referer: referer,
    ...extra,
  };
}

export function gatewayUrl(path: string): string {
  // path examples: "/places/v1/places:searchText", "/maps/api/geocode/json?address=..."
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${GATEWAY}${p}`;
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