// GOOGLE-INTEGRATION-GOVERNANCE-AUDIT-1
// Address Validation API — admin-gated.
import {
  getGoogleSecrets, googleHeaders, gatewayUrl,
  mapUpstreamError, logGoogleApiUsage,
  googleCorsHeaders, jsonResponse, requireAdmin,
} from "../_shared/google/gateway.ts";

interface Body {
  regionCode?: string;
  addressLines?: string[];
  locality?: string;
  administrativeArea?: string;
  postalCode?: string;
  languageCode?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: googleCorsHeaders });
  const gate = await requireAdmin(req);
  if (!gate.ok) return gate.res;

  const { lovableKey, googleKey, missing } = getGoogleSecrets();
  if (!lovableKey || !googleKey) return jsonResponse({ deferred: true, missing }, 200);

  let body: Body;
  try { body = await req.json(); } catch { return jsonResponse({ error: "invalid_body" }, 400); }
  const lines = Array.isArray(body.addressLines) ? body.addressLines.filter((l) => typeof l === "string" && l.trim()).slice(0, 5) : [];
  if (lines.length === 0) return jsonResponse({ error: "invalid_addressLines" }, 400);

  const start = Date.now();
  try {
    const res = await fetch(gatewayUrl("/addressvalidation/v1:validateAddress"), {
      method: "POST",
      headers: googleHeaders(lovableKey, googleKey),
      body: JSON.stringify({
        address: {
          regionCode: body.regionCode ?? "SA",
          addressLines: lines,
          locality: body.locality,
          administrativeArea: body.administrativeArea,
          postalCode: body.postalCode,
          languageCode: body.languageCode ?? "ar",
        },
      }),
    });
    const latency = Date.now() - start;
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      const m = mapUpstreamError(res.status, txt);
      await logGoogleApiUsage("address_validation", "error", latency, m.code);
      return jsonResponse({ error: m.code }, m.status);
    }
    const data = await res.json().catch(() => ({}));
    await logGoogleApiUsage("address_validation", "ok", latency, null);
    return jsonResponse({ data, latencyMs: latency }, 200);
  } catch {
    await logGoogleApiUsage("address_validation", "error", Date.now() - start, "exception");
    return jsonResponse({ error: "internal_error" }, 500);
  }
});