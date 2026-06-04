// ADMIN-DATA-ENRICHMENT — Google Places text search.
// Returns a list of candidate places (Google-Maps-like results) for a
// free-text query, with optional region biasing. Admin-only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_GOOGLE_REFERER = "https://qitaat.lovable.app/";

const GEOCODING_FALLBACK_MISSING_FIELDS = [
  "phone",
  "rating",
  "user_rating_count",
  "website",
  "business_status",
];

function extractGoogleReason(text: string): string | null {
  try {
    const parsed = JSON.parse(text) as { error?: { details?: Array<{ reason?: string }>; status?: string; message?: string }; type?: string; message?: string };
    const reason = parsed.error?.details?.find((d) => typeof d.reason === "string")?.reason;
    if (reason) return reason;
    if (typeof parsed.error?.status === "string") return parsed.error.status;
    if (typeof parsed.type === "string") return parsed.type;
    if (typeof parsed.error?.message === "string") return parsed.error.message.slice(0, 180);
    if (typeof parsed.message === "string") return parsed.message.slice(0, 180);
  } catch { /* keep generic */ }
  if (/API_KEY_SERVICE_BLOCKED/i.test(text)) return "API_KEY_SERVICE_BLOCKED";
  if (/SERVICE_DISABLED/i.test(text)) return "SERVICE_DISABLED";
  if (/API_KEY_HTTP_REFERRER_BLOCKED/i.test(text)) return "API_KEY_HTTP_REFERRER_BLOCKED";
  return null;
}

function mapGoogleSearchError(status: number, body: string): { error: string; detail: string } {
  const reason = extractGoogleReason(body);
  if (reason === "SERVICE_DISABLED") {
    return {
      error: "places_api_disabled",
      detail: "Places API (New) is disabled for the linked Google Maps connection.",
    };
  }
  if (reason === "API_KEY_HTTP_REFERRER_BLOCKED") {
    return {
      error: "google_referrer_blocked",
      detail: "Google rejected the request because the key referrer allowlist does not include this app domain.",
    };
  }
  if (reason === "API_KEY_SERVICE_BLOCKED") {
    return {
      error: "places_api_blocked_for_key",
      detail: "The linked Google Maps key is restricted from calling Places API (New).",
    };
  }
  return { error: "upstream_error", detail: reason ?? `Google upstream HTTP ${status}` };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface PlaceCandidate {
  place_id: string;
  name: string | null;
  address: string | null;
  primary_type: string | null;
  types: string[];
  rating: number | null;
  user_rating_count: number | null;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  phone: string | null;
  maps_url: string | null;
  icon_url: string | null;
  business_status: string | null;
}

type GeocodeComponent = { long_name?: string; short_name?: string; types?: string[] };
type GeocodeResult = {
  place_id?: string;
  formatted_address?: string;
  types?: string[];
  geometry?: { location?: { lat?: number; lng?: number } };
  address_components?: GeocodeComponent[];
};

function pickAddressComponent(components: GeocodeComponent[] | undefined, ...types: string[]): string | null {
  if (!Array.isArray(components)) return null;
  for (const type of types) {
    const found = components.find((c) => Array.isArray(c.types) && c.types.includes(type));
    if (found?.long_name || found?.short_name) return found.long_name ?? found.short_name ?? null;
  }
  return null;
}

async function fallbackGeocodeSearch(input: {
  query: string;
  region: string;
  language: string;
  googleKey: string;
  lovableKey: string;
  referer: string;
}): Promise<{ results: PlaceCandidate[]; upstreamStatus: number; upstreamMs: number; detail: string | null }> {
  const started = Date.now();
  const url = new URL("https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json");
  url.searchParams.set("address", input.query);
  url.searchParams.set("language", input.language);
  url.searchParams.set("region", input.region.toLowerCase());
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${input.lovableKey}`,
      "X-Connection-Api-Key": input.googleKey,
      "Referer": input.referer,
    },
  });
  const upstreamMs = Date.now() - started;
  const data = await res.json().catch(() => null) as { status?: string; error_message?: string; results?: GeocodeResult[] } | null;
  if (!res.ok || !data || (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS")) {
    return {
      results: [],
      upstreamStatus: res.status,
      upstreamMs,
      detail: data?.error_message ?? data?.status ?? `Geocoding HTTP ${res.status}`,
    };
  }
  const results = (Array.isArray(data.results) ? data.results : []).slice(0, 20).map((r): PlaceCandidate => {
    const lat = r.geometry?.location?.lat;
    const lng = r.geometry?.location?.lng;
    const name = pickAddressComponent(r.address_components, "establishment", "point_of_interest", "premise")
      ?? r.formatted_address
      ?? null;
    return {
      place_id: r.place_id ?? `geocode_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`,
      name,
      address: r.formatted_address ?? null,
      primary_type: Array.isArray(r.types) ? r.types[0] ?? null : null,
      types: Array.isArray(r.types) ? r.types : [],
      rating: null,
      user_rating_count: null,
      latitude: typeof lat === "number" ? lat : null,
      longitude: typeof lng === "number" ? lng : null,
      website: null,
      phone: null,
      maps_url: typeof lat === "number" && typeof lng === "number"
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}${r.place_id ? `&query_place_id=${encodeURIComponent(r.place_id)}` : ""}`
        : (r.place_id ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(r.place_id)}` : null),
      icon_url: null,
      business_status: null,
    };
  });
  return { results, upstreamStatus: res.status, upstreamMs, detail: data.status ?? null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const log = (level: "info" | "warn" | "error", msg: string, extra: Record<string, unknown> = {}) => {
    const line = JSON.stringify({
      requestId, fn: "admin-enrichment-search", level, msg,
      durationMs: Date.now() - startedAt, ...extra,
    });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      log("warn", "missing_auth_header");
      return json({ error: "unauthorized", requestId }, 401);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      log("warn", "no_user_for_token");
      return json({ error: "unauthorized", requestId }, 401);
    }
    const { data: isAdmin } = await sb.rpc("has_admin_access", {
      _user_id: user.id,
    });
    if (isAdmin !== true) {
      log("warn", "not_admin", { userId: user.id });
      return json({ error: "forbidden", requestId }, 403);
    }

    const body = await req.json().catch(() => ({})) as {
      query?: string;
      region?: string;
      language?: string;
      pageToken?: string;
      pageSize?: number;
      bypassCache?: boolean;
    };
    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query || query.length < 2 || query.length > 200) {
      log("warn", "invalid_query", { length: query.length });
      return json({ error: "invalid_query", requestId }, 400);
    }
    const region = (body.region ?? "SA").toUpperCase().slice(0, 2);
    const language = (body.language ?? "ar").toLowerCase().slice(0, 5);
    const pageToken = typeof body.pageToken === "string" && body.pageToken.length > 0
      ? body.pageToken.slice(0, 500)
      : null;
    const pageSize = Math.min(Math.max(Number(body.pageSize) || 10, 1), 20);
    const bypassCache = body.bypassCache === true;

    // Cache lookup (service-role client to bypass RLS for system table).
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const svc = serviceKey
      ? createClient(supabaseUrl, serviceKey)
      : null;
    const cacheKey = `search:${region}:${language}:${pageSize}:${pageToken ?? ""}:${query.toLowerCase()}`;
    if (svc && !bypassCache) {
      const { data: cached } = await svc
        .from("admin_enrichment_cache")
        .select("payload, expires_at")
        .eq("cache_key", cacheKey)
        .maybeSingle();
      if (cached && new Date(cached.expires_at) > new Date()) {
        return json({ ...(cached.payload as Record<string, unknown>), cached: true });
      }
    }

    const googleKey = Deno.env.get("GOOGLE_MAPS_API_KEY") ?? "";
    const lovableKey = Deno.env.get("LOVABLE_API_KEY") ?? "";
    const googleReferer = Deno.env.get("GOOGLE_MAPS_HTTP_REFERER") ?? DEFAULT_GOOGLE_REFERER;
    if (!googleKey || !lovableKey) {
      const missing: string[] = [];
      if (!googleKey) missing.push("GOOGLE_MAPS_API_KEY");
      if (!lovableKey) missing.push("LOVABLE_API_KEY");
      log("warn", "missing_secrets", { missing });
      return json({ ok: true, results: [], deferred: true, missing, requestId });
    }

    log("info", "calling_gateway", { query, region, language, pageSize, hasPageToken: Boolean(pageToken) });
    const upstreamStart = Date.now();
    let res: Response;
    try {
      res = await fetch(
        "https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": googleKey,
            "Referer": googleReferer,
            "X-Goog-FieldMask": [
              "places.id",
              "places.displayName",
              "places.formattedAddress",
              "places.location",
              "places.types",
              "places.primaryType",
              "places.rating",
              "places.userRatingCount",
              "places.websiteUri",
              "places.internationalPhoneNumber",
              "places.nationalPhoneNumber",
              "places.googleMapsUri",
              "places.iconMaskBaseUri",
              "places.businessStatus",
            ].join(","),
          },
          body: JSON.stringify({
            textQuery: query,
            languageCode: language,
            regionCode: region,
            pageSize,
            ...(pageToken ? { pageToken } : {}),
          }),
        },
      );
    } catch (fetchErr) {
      const message = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      log("error", "gateway_fetch_threw", { message, upstreamMs: Date.now() - upstreamStart });
      return json({
        ok: false, error: "network_error", results: [],
        requestId, upstreamMs: Date.now() - upstreamStart, detail: message.slice(0, 200),
      }, 200);
    }
    const upstreamMs = Date.now() - upstreamStart;
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      const mapped = mapGoogleSearchError(res.status, errorText);
      log("error", "gateway_http_error", {
        upstreamStatus: res.status, upstreamMs,
        mappedError: mapped.error,
        body: errorText.slice(0, 500),
      });
      if (["places_api_disabled", "places_api_blocked_for_key", "google_referrer_blocked", "upstream_unauthorized", "upstream_error"].includes(mapped.error)) {
        const fallback = await fallbackGeocodeSearch({ query, region, language, googleKey, lovableKey, referer: googleReferer });
        log(fallback.results.length ? "warn" : "error", "geocoding_fallback_result", {
          count: fallback.results.length,
          upstreamStatus: fallback.upstreamStatus,
          upstreamMs: fallback.upstreamMs,
          detail: fallback.detail,
        });
        return json({
          ok: true,
          results: fallback.results,
          nextPageToken: null,
          requestId,
          upstreamStatus: res.status,
          upstreamMs,
          fallback: "geocoding",
          fallbackReason: mapped.error,
          fallbackMissingFields: GEOCODING_FALLBACK_MISSING_FIELDS,
          fallbackDiagnostics: {
            placesStatus: res.status,
            placesMs: upstreamMs,
            geocodingStatus: fallback.upstreamStatus,
            geocodingMs: fallback.upstreamMs,
            geocodingDetail: fallback.detail,
          },
          detail: fallback.results.length
            ? `Places unavailable (${mapped.error}); returned Geocoding fallback results.`
            : `Places unavailable (${mapped.error}); Geocoding fallback returned no matches.`,
        });
      }
      return json({
        ok: false, error: mapped.error, results: [],
        requestId, upstreamStatus: res.status, upstreamMs,
        detail: mapped.detail,
      }, 200);
    }
    const data = await res.json().catch(() => null);
    const places: unknown[] = Array.isArray(data?.places) ? data.places : [];
    const results: PlaceCandidate[] = places.map((p) => {
      const pl = p as Record<string, unknown>;
      const loc = pl.location as { latitude?: number; longitude?: number } | undefined;
      const dn = pl.displayName as { text?: string } | undefined;
      return {
        place_id: String(pl.id ?? ""),
        name: dn?.text ?? null,
        address: (pl.formattedAddress as string) ?? null,
        primary_type: (pl.primaryType as string) ?? null,
        types: Array.isArray(pl.types) ? (pl.types as string[]) : [],
        rating: typeof pl.rating === "number" ? pl.rating : null,
        user_rating_count: typeof pl.userRatingCount === "number" ? pl.userRatingCount : null,
        latitude: typeof loc?.latitude === "number" ? loc.latitude : null,
        longitude: typeof loc?.longitude === "number" ? loc.longitude : null,
        website: (pl.websiteUri as string) ?? null,
        phone: (pl.internationalPhoneNumber as string) ??
          (pl.nationalPhoneNumber as string) ?? null,
        maps_url: (pl.googleMapsUri as string) ??
          (pl.id ? `https://www.google.com/maps/place/?q=place_id:${pl.id}` : null),
        icon_url: (pl.iconMaskBaseUri as string) ?? null,
        business_status: (pl.businessStatus as string) ?? null,
      };
    }).filter((r) => r.place_id);

    const nextPageToken = typeof data?.nextPageToken === "string" ? data.nextPageToken : null;
    const payload = { ok: true, results, nextPageToken, requestId, upstreamMs };
    log("info", "gateway_ok", { count: results.length, upstreamMs });
    if (svc) {
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await svc.from("admin_enrichment_cache").upsert({
        cache_key: cacheKey,
        payload,
        expires_at: expires,
      });
    }
    return json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log("error", "unhandled_exception", { message });
    return json({ ok: false, error: "internal_error", results: [], requestId, detail: message.slice(0, 200) }, 200);
  }
});