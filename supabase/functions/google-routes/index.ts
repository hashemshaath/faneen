// GOOGLE-INTEGRATION-GOVERNANCE-AUDIT-1
// Routes API — admin-gated. Supports computeRoutes + computeRouteMatrix.
import {
  getGoogleSecrets, googleHeaders, gatewayUrl,
  mapUpstreamError, logGoogleApiUsage,
  googleCorsHeaders, jsonResponse, requireAdmin,
} from "../_shared/google/gateway.ts";

interface LatLng { latitude: number; longitude: number }
interface Body {
  op: "computeRoutes" | "computeRouteMatrix";
  origin?: LatLng;
  destination?: LatLng;
  origins?: LatLng[];
  destinations?: LatLng[];
  travelMode?: "DRIVE" | "WALK" | "BICYCLE" | "TWO_WHEELER";
  fieldMask?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: googleCorsHeaders });
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.res;

  const { lovableKey, googleKey, missing } = getGoogleSecrets();
  if (!lovableKey || !googleKey) return jsonResponse({ deferred: true, missing }, 200);

  let body: Body;
  try { body = await req.json(); } catch { return jsonResponse({ error: "invalid_body" }, 400); }
  const mode = body.travelMode ?? "DRIVE";
  const start = Date.now();

  try {
    let res: Response;
    if (body.op === "computeRoutes") {
      if (!body.origin || !body.destination) return jsonResponse({ error: "invalid_endpoints" }, 400);
      const fieldMask = body.fieldMask ?? "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline";
      res = await fetch(gatewayUrl("/routes/directions/v2:computeRoutes"), {
        method: "POST",
        headers: googleHeaders(lovableKey, googleKey, { "X-Goog-FieldMask": fieldMask }),
        body: JSON.stringify({
          origin: { location: { latLng: body.origin } },
          destination: { location: { latLng: body.destination } },
          travelMode: mode,
        }),
      });
    } else if (body.op === "computeRouteMatrix") {
      if (!Array.isArray(body.origins) || !Array.isArray(body.destinations)) {
        return jsonResponse({ error: "invalid_matrix" }, 400);
      }
      const fieldMask = body.fieldMask ?? "originIndex,destinationIndex,duration,distanceMeters,status";
      res = await fetch(gatewayUrl("/routes/distanceMatrix/v2:computeRouteMatrix"), {
        method: "POST",
        headers: googleHeaders(lovableKey, googleKey, { "X-Goog-FieldMask": fieldMask }),
        body: JSON.stringify({
          origins: body.origins.map((o) => ({ waypoint: { location: { latLng: o } } })),
          destinations: body.destinations.map((d) => ({ waypoint: { location: { latLng: d } } })),
          travelMode: mode,
        }),
      });
    } else {
      return jsonResponse({ error: "unsupported_op" }, 400);
    }

    const latency = Date.now() - start;
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      const m = mapUpstreamError(res.status, txt);
      await logGoogleApiUsage("routes", "error", latency, m.code);
      return jsonResponse({ error: m.code }, m.status);
    }
    const data = await res.json().catch(() => ({}));
    await logGoogleApiUsage("routes", "ok", latency, null);
    return jsonResponse({ data, latencyMs: latency }, 200);
  } catch {
    await logGoogleApiUsage("routes", "error", Date.now() - start, "exception");
    return jsonResponse({ error: "internal_error" }, 500);
  }
});