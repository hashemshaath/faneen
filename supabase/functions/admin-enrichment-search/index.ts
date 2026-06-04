// ADMIN-DATA-ENRICHMENT — Google Places text search.
// Returns a list of candidate places (Google-Maps-like results) for a
// free-text query, with optional region biasing. Admin-only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: isAdmin } = await sb.rpc("has_admin_access", {
      _user_id: user.id,
    });
    if (isAdmin !== true) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({})) as {
      query?: string;
      region?: string;
      language?: string;
    };
    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (!query || query.length < 2 || query.length > 200) {
      return json({ error: "invalid_query" }, 400);
    }
    const region = (body.region ?? "SA").toUpperCase().slice(0, 2);
    const language = (body.language ?? "ar").toLowerCase().slice(0, 5);

    const googleKey = Deno.env.get("GOOGLE_MAPS_API_KEY") ?? "";
    if (!googleKey) {
      return json({ ok: true, results: [], deferred: true, missing: ["GOOGLE_MAPS_API_KEY"] });
    }

    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": googleKey,
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
          pageSize: 10,
        }),
      },
    );
    if (!res.ok) {
      return json({ ok: false, error: "upstream_error", results: [] }, 200);
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

    return json({ ok: true, results });
  } catch {
    return json({ ok: false, error: "internal_error", results: [] }, 200);
  }
});