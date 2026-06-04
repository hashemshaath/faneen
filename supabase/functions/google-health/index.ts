// GOOGLE-INTEGRATION-GOVERNANCE-AUDIT-1
// Admin health check: probes Places, Geocoding, Routes, Address Validation
// through the gateway with one cheap call each. Returns per-API health and
// pulls the last 24h of usage_log aggregates so the admin dashboard can
// render without extra queries. Never returns or logs API keys.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getGoogleSecrets, googleHeaders, gatewayUrl,
  googleCorsHeaders, jsonResponse, requireAdmin,
} from "../_shared/google/gateway.ts";

type ApiKey = "places" | "geocoding" | "routes" | "address_validation";
interface ProbeResult { ok: boolean; latencyMs: number; status: number; errorCode: string | null }

function extractGoogleReason(text: string): string | null {
  try {
    const parsed = JSON.parse(text) as { error?: { details?: Array<{ reason?: string }>; status?: string; message?: string } };
    const reason = parsed.error?.details?.find((d) => typeof d.reason === "string")?.reason;
    return reason ?? parsed.error?.status ?? parsed.error?.message?.slice(0, 80) ?? null;
  } catch { /* fall through */ }
  return text.slice(0, 60).replace(/[^a-zA-Z0-9_\- ]/g, "") || "http_error";
}

async function probe(url: string, init: RequestInit): Promise<ProbeResult> {
  const t = Date.now();
  try {
    const res = await fetch(url, init);
    const latency = Date.now() - t;
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { ok: false, latencyMs: latency, status: res.status, errorCode: extractGoogleReason(txt) };
    }
    return { ok: true, latencyMs: latency, status: res.status, errorCode: null };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t, status: 0, errorCode: e instanceof Error ? e.name : "exception" };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: googleCorsHeaders });
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.res;

  const { lovableKey, googleKey, missing } = getGoogleSecrets();
  if (!lovableKey || !googleKey) {
    return jsonResponse({
      deferred: true, missing,
      apis: { places: null, geocoding: null, routes: null, address_validation: null },
      usage: [],
    }, 200);
  }

  // Cheap probes
  const fm = "places.id";
  const headers = googleHeaders(lovableKey, googleKey, { "X-Goog-FieldMask": fm });
  const [places, geocoding, routes, addressValidation] = await Promise.all([
    probe(gatewayUrl("/places/v1/places:searchText"), {
      method: "POST", headers,
      body: JSON.stringify({ textQuery: "Riyadh", maxResultCount: 1 }),
    }),
    probe(gatewayUrl("/maps/api/geocode/json?address=Riyadh"), {
      method: "GET",
      headers: googleHeaders(lovableKey, googleKey),
    }),
    probe(gatewayUrl("/routes/distanceMatrix/v2:computeRouteMatrix"), {
      method: "POST",
      headers: googleHeaders(lovableKey, googleKey, { "X-Goog-FieldMask": "originIndex,destinationIndex,status" }),
      body: JSON.stringify({
        origins: [{ waypoint: { location: { latLng: { latitude: 24.71, longitude: 46.67 } } } }],
        destinations: [{ waypoint: { location: { latLng: { latitude: 24.72, longitude: 46.68 } } } }],
        travelMode: "DRIVE",
      }),
    }),
    probe(gatewayUrl("/addressvalidation/v1:validateAddress"), {
      method: "POST",
      headers: googleHeaders(lovableKey, googleKey),
      body: JSON.stringify({ address: { regionCode: "SA", addressLines: ["King Fahd Rd"] } }),
    }),
  ]);

  const apis: Record<ApiKey, ProbeResult> = { places, geocoding, routes, address_validation: addressValidation };

  // Usage aggregates (24h)
  let usage: Array<{ api: string; ok: number; err: number; avg_latency_ms: number }> = [];
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const sr = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, sr);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await admin
      .from("google_api_usage_log")
      .select("api,status,latency_ms")
      .gte("created_at", since)
      .limit(5000);
    if (Array.isArray(data)) {
      const agg = new Map<string, { ok: number; err: number; sum: number; n: number }>();
      for (const row of data) {
        const k = String(row.api);
        const cur = agg.get(k) ?? { ok: 0, err: 0, sum: 0, n: 0 };
        if (row.status === "ok") cur.ok++; else cur.err++;
        if (typeof row.latency_ms === "number") { cur.sum += row.latency_ms; cur.n++; }
        agg.set(k, cur);
      }
      usage = Array.from(agg.entries()).map(([api, v]) => ({
        api, ok: v.ok, err: v.err,
        avg_latency_ms: v.n ? Math.round(v.sum / v.n) : 0,
      }));
    }
  } catch { /* ignore */ }

  const healthScore = Math.round(
    (Object.values(apis).filter((p) => p.ok).length / Object.keys(apis).length) * 100,
  );
  return jsonResponse({ checkedAt: new Date().toISOString(), healthScore, apis, usage }, 200);
});