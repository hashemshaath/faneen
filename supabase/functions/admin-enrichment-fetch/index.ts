// ADMIN-DATA-ENRICHMENT-MICROSERVICE-1 — fetch step.
// Pulls business data from a website URL (via Firecrawl) and/or a Google
// Maps / Place URL (via Google Places API New), normalises the result
// into a single per-field shape ({ value, source, confidence }), and
// flags conflicts between sources. The actual save is performed by
// `admin-enrichment-apply` only after admin review.
//
// Security:
//   - Requires an authenticated admin JWT (has_admin_access).
//   - All upstream secrets stay server-side.
//   - Missing upstream secrets => 200 OK with { deferred: true, missing }.
//   - Never throws raw upstream error text back to the client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Source = "website" | "google_maps" | "ai_enhanced" | "manual";
type Confidence = "high" | "medium" | "low";

interface EnrichmentField {
  value: string | null;
  source: Source;
  confidence: Confidence;
}

interface MergedDraft {
  name_ar: EnrichmentField;
  name_en: EnrichmentField;
  activity: EnrichmentField;
  description_ar: EnrichmentField;
  description_en: EnrichmentField;
  phone: EnrichmentField;
  website: EnrichmentField;
  city: EnrichmentField;
  district: EnrichmentField;
  street: EnrichmentField;
  national_address: EnrichmentField;
  latitude: EnrichmentField;
  longitude: EnrichmentField;
  working_hours: EnrichmentField;
  logo_url: EnrichmentField;
  social_links: EnrichmentField;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeUrl(input: unknown, max = 500): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > max) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function emptyField(): EnrichmentField {
  return { value: null, source: "manual", confidence: "low" };
}

function emptyDraft(): MergedDraft {
  return {
    name_ar: emptyField(),
    name_en: emptyField(),
    activity: emptyField(),
    description_ar: emptyField(),
    description_en: emptyField(),
    phone: emptyField(),
    website: emptyField(),
    city: emptyField(),
    district: emptyField(),
    street: emptyField(),
    national_address: emptyField(),
    latitude: emptyField(),
    longitude: emptyField(),
    working_hours: emptyField(),
    logo_url: emptyField(),
    social_links: emptyField(),
  };
}

async function fetchWebsite(
  url: string,
  firecrawlKey: string,
): Promise<Record<string, string | null>> {
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "links"],
        onlyMainContent: true,
      }),
    });
    if (!res.ok) {
      await res.text().catch(() => "");
      return {};
    }
    const data = await res.json().catch(() => null);
    const md: string =
      (data && (data.markdown || data?.data?.markdown)) ?? "";
    const meta = (data && (data.metadata || data?.data?.metadata)) ?? {};
    const links: string[] =
      (data && (data.links || data?.data?.links)) ?? [];

    const phoneMatch = md.match(/(\+?\d[\d\s\-()]{7,}\d)/);
    const social = links.filter((l) =>
      /(facebook|instagram|twitter|x\.com|linkedin|youtube|tiktok|snapchat|wa\.me|whatsapp)\./i
        .test(l),
    );

    return {
      name: typeof meta.title === "string" ? meta.title : null,
      description: typeof meta.description === "string" ? meta.description : null,
      phone: phoneMatch ? phoneMatch[1] : null,
      website: url,
      social_links: social.length ? JSON.stringify(social.slice(0, 10)) : null,
    };
  } catch {
    return {};
  }
}

async function fetchGoogleMaps(
  url: string,
  googleKey: string,
): Promise<Record<string, string | null>> {
  // Resolve a place via Places API (New) text search using the maps URL or its name fragment.
  // We pass the raw URL as a textQuery — Places API will resolve recognised Google Maps links.
  try {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": googleKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.addressComponents,places.internationalPhoneNumber,places.nationalPhoneNumber,places.websiteUri,places.location,places.regularOpeningHours,places.types,places.primaryType,places.iconMaskBaseUri",
        },
        body: JSON.stringify({ textQuery: url, languageCode: "ar" }),
      },
    );
    if (!res.ok) {
      await res.text().catch(() => "");
      return {};
    }
    const data = await res.json().catch(() => null);
    const place = data?.places?.[0];
    if (!place) return {};
    const name = place?.displayName?.text ?? null;
    const addr = place?.formattedAddress ?? null;
    const comp = Array.isArray(place?.addressComponents)
      ? place.addressComponents
      : [];
    const findComp = (type: string): string | null => {
      const c = comp.find((c: { types?: string[] }) =>
        Array.isArray(c.types) && c.types.includes(type)
      );
      return c ? (c.longText ?? c.shortText ?? null) : null;
    };
    return {
      name,
      activity: place?.primaryType ?? null,
      description: addr,
      phone: place?.internationalPhoneNumber ?? place?.nationalPhoneNumber ??
        null,
      website: place?.websiteUri ?? null,
      city: findComp("locality") ?? findComp("administrative_area_level_2"),
      district: findComp("sublocality") ?? findComp("neighborhood"),
      street: findComp("route"),
      national_address: addr,
      latitude: place?.location?.latitude != null
        ? String(place.location.latitude)
        : null,
      longitude: place?.location?.longitude != null
        ? String(place.location.longitude)
        : null,
      working_hours:
        place?.regularOpeningHours?.weekdayDescriptions
          ? JSON.stringify(place.regularOpeningHours.weekdayDescriptions)
          : null,
      logo_url: place?.iconMaskBaseUri ?? null,
    };
  } catch {
    return {};
  }
}

function pickField(
  website: string | null | undefined,
  maps: string | null | undefined,
  preferWebsite = false,
): EnrichmentField {
  const w = website && website.trim() ? website.trim() : null;
  const m = maps && maps.trim() ? maps.trim() : null;
  if (w && m && w !== m) {
    // Conflict — keep maps as primary (usually more structured), mark medium
    return {
      value: preferWebsite ? w : m,
      source: preferWebsite ? "website" : "google_maps",
      confidence: "medium",
    };
  }
  if (m) return { value: m, source: "google_maps", confidence: "high" };
  if (w) return { value: w, source: "website", confidence: "medium" };
  return emptyField();
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
      website?: string;
      mapsUrl?: string;
    };
    const website = safeUrl(body.website);
    const mapsUrl = safeUrl(body.mapsUrl);
    if (!website && !mapsUrl) {
      return json({ error: "no_sources" }, 400);
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY") ?? "";
    const googleKey = Deno.env.get("GOOGLE_MAPS_API_KEY") ?? "";

    const missing: string[] = [];
    if (website && !firecrawlKey) missing.push("FIRECRAWL_API_KEY");
    if (mapsUrl && !googleKey) missing.push("GOOGLE_MAPS_API_KEY");

    const websiteData = website && firecrawlKey
      ? await fetchWebsite(website, firecrawlKey)
      : {};
    const mapsData = mapsUrl && googleKey
      ? await fetchGoogleMaps(mapsUrl, googleKey)
      : {};

    const merged = emptyDraft();
    merged.name_ar = pickField(null, mapsData.name ?? null);
    merged.name_en = pickField(websiteData.name ?? null, null, true);
    merged.activity = pickField(null, mapsData.activity ?? null);
    merged.description_ar = pickField(null, mapsData.description ?? null);
    merged.description_en = pickField(websiteData.description ?? null, null, true);
    merged.phone = pickField(websiteData.phone ?? null, mapsData.phone ?? null);
    merged.website = pickField(websiteData.website ?? null, mapsData.website ?? null, true);
    merged.city = pickField(null, mapsData.city ?? null);
    merged.district = pickField(null, mapsData.district ?? null);
    merged.street = pickField(null, mapsData.street ?? null);
    merged.national_address = pickField(null, mapsData.national_address ?? null);
    merged.latitude = pickField(null, mapsData.latitude ?? null);
    merged.longitude = pickField(null, mapsData.longitude ?? null);
    merged.working_hours = pickField(null, mapsData.working_hours ?? null);
    merged.logo_url = pickField(null, mapsData.logo_url ?? null);
    merged.social_links = pickField(websiteData.social_links ?? null, null, true);

    // Conflict map per-field (only fields where both sources had a value).
    const conflicts: Record<string, { website: string | null; google_maps: string | null }> = {};
    const compareKeys: Array<keyof typeof websiteData> = [
      "name",
      "description",
      "phone",
      "website",
    ];
    for (const k of compareKeys) {
      const w = websiteData[k] ?? null;
      const m = (mapsData as Record<string, string | null>)[k] ?? null;
      if (w && m && String(w).trim() !== String(m).trim()) {
        conflicts[k] = { website: w, google_maps: m };
      }
    }

    // Persist a draft row so we have an audit anchor.
    const { data: session, error: insertErr } = await sb
      .from("admin_enrichment_sessions")
      // deno-lint-ignore no-explicit-any
      .insert({
        actor_id: user.id,
        website_url: website,
        maps_url: mapsUrl,
        status: "draft",
        sources: { website: websiteData, google_maps: mapsData },
        merged,
      } as any)
      .select("id")
      .single();

    if (insertErr) {
      return json({ error: "session_create_failed" }, 200);
    }

    return json({
      ok: true,
      session_id: session.id,
      sources: { website: websiteData, google_maps: mapsData },
      merged,
      conflicts,
      deferred: missing.length > 0,
      missing,
    });
  } catch {
    return json({ error: "internal_error" }, 200);
  }
});