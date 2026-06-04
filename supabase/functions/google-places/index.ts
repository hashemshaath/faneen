// GOOGLE-INTEGRATION-GOVERNANCE-AUDIT-1
// Unified Places API (New) edge function. Admin-gated.
// Operations: searchText | searchNearby | getDetails
import {
  getGoogleSecrets, googleHeaders, gatewayUrl,
  mapUpstreamError, logGoogleApiUsage,
  googleCorsHeaders, jsonResponse, requireAdmin,
} from "../_shared/google/gateway.ts";

interface Body {
  op: "searchText" | "searchNearby" | "getDetails";
  textQuery?: string;
  placeId?: string;
  fieldMask?: string;
  languageCode?: string;
  location?: { latitude: number; longitude: number; radius?: number };
  includedTypes?: string[];
  maxResultCount?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: googleCorsHeaders });
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.res;

  const { lovableKey, googleKey, missing } = getGoogleSecrets();
  if (!lovableKey || !googleKey) return jsonResponse({ deferred: true, missing }, 200);

  let body: Body;
  try { body = await req.json(); } catch { return jsonResponse({ error: "invalid_body" }, 400); }
  if (!body || typeof body.op !== "string") return jsonResponse({ error: "invalid_op" }, 400);

  const fieldMask = body.fieldMask ?? "places.id,places.displayName,places.formattedAddress,places.location";
  const lang = body.languageCode ?? "ar";
  const start = Date.now();
  try {
    let res: Response;
    if (body.op === "searchText") {
      const q = (body.textQuery ?? "").toString().trim();
      if (!q || q.length > 500) return jsonResponse({ error: "invalid_textQuery" }, 400);
      res = await fetch(gatewayUrl("/places/v1/places:searchText"), {
        method: "POST",
        headers: googleHeaders(lovableKey, googleKey, { "X-Goog-FieldMask": fieldMask }),
        body: JSON.stringify({ textQuery: q, languageCode: lang, maxResultCount: body.maxResultCount ?? 10 }),
      });
    } else if (body.op === "searchNearby") {
      if (!body.location) return jsonResponse({ error: "invalid_location" }, 400);
      res = await fetch(gatewayUrl("/places/v1/places:searchNearby"), {
        method: "POST",
        headers: googleHeaders(lovableKey, googleKey, { "X-Goog-FieldMask": fieldMask }),
        body: JSON.stringify({
          locationRestriction: {
            circle: {
              center: { latitude: body.location.latitude, longitude: body.location.longitude },
              radius: body.location.radius ?? 1500,
            },
          },
          includedTypes: body.includedTypes,
          maxResultCount: body.maxResultCount ?? 10,
          languageCode: lang,
        }),
      });
    } else if (body.op === "getDetails") {
      const id = (body.placeId ?? "").toString().trim();
      if (!id || id.length > 200) return jsonResponse({ error: "invalid_placeId" }, 400);
      res = await fetch(
        gatewayUrl(`/places/v1/places/${encodeURIComponent(id)}?languageCode=${encodeURIComponent(lang)}`),
        { method: "GET", headers: googleHeaders(lovableKey, googleKey, { "X-Goog-FieldMask": fieldMask.replace(/^places\./gm, "") }) },
      );
    } else {
      return jsonResponse({ error: "unsupported_op" }, 400);
    }

    const latency = Date.now() - start;
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      const m = mapUpstreamError(res.status, txt);
      await logGoogleApiUsage("places", "error", latency, m.code);
      return jsonResponse({ error: m.code }, m.status);
    }
    const data = await res.json().catch(() => ({}));
    await logGoogleApiUsage("places", "ok", latency, null);
    return jsonResponse({ data, latencyMs: latency }, 200);
  } catch (_e) {
    await logGoogleApiUsage("places", "error", Date.now() - start, "exception");
    return jsonResponse({ error: "internal_error" }, 500);
  }
});