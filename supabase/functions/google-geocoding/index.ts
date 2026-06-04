// GOOGLE-INTEGRATION-GOVERNANCE-AUDIT-1
// Forward + reverse Geocoding via the Places API (New) — admin-gated.
// Uses the legacy /maps/api/geocode/json gateway path which is the most
// cost-effective and matches existing enrichment helpers.
import {
  getGoogleSecrets, googleHeaders, gatewayUrl,
  mapUpstreamError, logGoogleApiUsage,
  googleCorsHeaders, jsonResponse, requireAdmin,
} from "../_shared/google/gateway.ts";

interface Body { op: "forward" | "reverse"; address?: string; lat?: number; lng?: number; languageCode?: string }

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: googleCorsHeaders });
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.res;

  const { lovableKey, googleKey, missing } = getGoogleSecrets();
  if (!lovableKey || !googleKey) return jsonResponse({ deferred: true, missing }, 200);

  let body: Body;
  try { body = await req.json(); } catch { return jsonResponse({ error: "invalid_body" }, 400); }
  const lang = body.languageCode ?? "ar";
  const start = Date.now();

  try {
    let path: string;
    if (body.op === "forward") {
      const a = (body.address ?? "").toString().trim();
      if (!a || a.length > 500) return jsonResponse({ error: "invalid_address" }, 400);
      path = `/maps/api/geocode/json?address=${encodeURIComponent(a)}&language=${encodeURIComponent(lang)}`;
    } else if (body.op === "reverse") {
      const lat = Number(body.lat), lng = Number(body.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return jsonResponse({ error: "invalid_coords" }, 400);
      }
      path = `/maps/api/geocode/json?latlng=${lat},${lng}&language=${encodeURIComponent(lang)}`;
    } else {
      return jsonResponse({ error: "unsupported_op" }, 400);
    }

    const res = await fetch(gatewayUrl(path), { method: "GET", headers: googleHeaders(lovableKey, googleKey) });
    const latency = Date.now() - start;
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      const m = mapUpstreamError(res.status, txt);
      await logGoogleApiUsage("geocoding", "error", latency, m.code);
      return jsonResponse({ error: m.code }, m.status);
    }
    const data = await res.json().catch(() => ({}));
    // Google returns 200 OK with status="REQUEST_DENIED" / "ZERO_RESULTS" — surface that.
    const upstream = typeof data?.status === "string" ? data.status : "UNKNOWN";
    if (upstream !== "OK" && upstream !== "ZERO_RESULTS") {
      await logGoogleApiUsage("geocoding", "error", latency, upstream);
      return jsonResponse({ error: "upstream_status", upstreamStatus: upstream }, 502);
    }
    await logGoogleApiUsage("geocoding", "ok", latency, null);
    return jsonResponse({ data, latencyMs: latency }, 200);
  } catch {
    await logGoogleApiUsage("geocoding", "error", Date.now() - start, "exception");
    return jsonResponse({ error: "internal_error" }, 500);
  }
});