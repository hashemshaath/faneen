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
  activity_ar: EnrichmentField;
  activity_en: EnrichmentField;
  description_ar: EnrichmentField;
  description_en: EnrichmentField;
  phone: EnrichmentField;
  phone_mobile: EnrichmentField;
  phone_landline: EnrichmentField;
  unified_number: EnrichmentField;
  whatsapp: EnrichmentField;
  customer_service: EnrichmentField;
  email: EnrichmentField;
  website: EnrichmentField;
  city: EnrichmentField;
  city_en: EnrichmentField;
  district: EnrichmentField;
  district_en: EnrichmentField;
  street: EnrichmentField;
  street_en: EnrichmentField;
  national_address: EnrichmentField;
  national_address_en: EnrichmentField;
  latitude: EnrichmentField;
  longitude: EnrichmentField;
  working_hours: EnrichmentField;
  logo_url: EnrichmentField;
  social_links: EnrichmentField;
  facebook: EnrichmentField;
  instagram: EnrichmentField;
  twitter: EnrichmentField;
  linkedin: EnrichmentField;
  youtube: EnrichmentField;
  tiktok: EnrichmentField;
  snapchat: EnrichmentField;
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
  url: string | null,
  placeId: string | null,
  googleKey: string,
  lovableKey: string,
): Promise<{
  fields: Record<string, string | null>;
  raw: { placeId: string | null; addressComponents: Array<Record<string, unknown>>; placeRaw: Record<string, unknown> | null };
}> {
  // Prefer Place Details (GET /places/{id}) when a place_id is known — this returns
  // the exact resource. Fall back to textSearch with the URL only when no id is available
  // (e.g. admin pasted a maps URL manually without using the search step).
  const fieldMask = [
    "id",
    "displayName",
    "formattedAddress",
    "shortFormattedAddress",
    "addressComponents",
    "internationalPhoneNumber",
    "nationalPhoneNumber",
    "websiteUri",
    "location",
    "regularOpeningHours",
    "types",
    "primaryType",
    "iconMaskBaseUri",
    "googleMapsUri",
  ].join(",");
  try {
    let place: Record<string, unknown> | null = null;
    if (placeId) {
      const res = await fetch(
        `https://connector-gateway.lovable.dev/google_maps/places/v1/places/${encodeURIComponent(placeId)}?languageCode=ar`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": googleKey,
            "X-Goog-FieldMask": fieldMask,
          },
        },
      );
      if (res.ok) place = await res.json().catch(() => null);
      else await res.text().catch(() => "");
    }
    if (!place && url) {
      const res = await fetch(
        "https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": googleKey,
            "X-Goog-FieldMask": fieldMask.split(",").map((f) => `places.${f}`).join(","),
          },
          body: JSON.stringify({ textQuery: url, languageCode: "ar" }),
        },
      );
      if (res.ok) {
        const data = await res.json().catch(() => null);
        place = data?.places?.[0] ?? null;
      } else {
        await res.text().catch(() => "");
      }
    }
    if (!place) return { fields: {}, raw: { placeId, addressComponents: [], placeRaw: null } };
    const p = place as Record<string, unknown>;
    const dn = p.displayName as { text?: string } | undefined;
    const name = dn?.text ?? null;
    const addr = (p.formattedAddress as string) ?? null;
    const comp = Array.isArray(p.addressComponents)
      ? (p.addressComponents as Array<{ types?: string[]; longText?: string; shortText?: string }>)
      : [];
    const findComp = (...types: string[]): string | null => {
      for (const t of types) {
        const c = comp.find((c) => Array.isArray(c.types) && c.types.includes(t));
        if (c) return c.longText ?? c.shortText ?? null;
      }
      return null;
    };
    const loc = p.location as { latitude?: number; longitude?: number } | undefined;
    const oh = p.regularOpeningHours as { weekdayDescriptions?: string[] } | undefined;
    const fields = {
      name,
      activity: (p.primaryType as string) ?? null,
      description: addr,
      phone: (p.internationalPhoneNumber as string) ?? (p.nationalPhoneNumber as string) ?? null,
      website: (p.websiteUri as string) ?? null,
      city: findComp("locality", "postal_town", "administrative_area_level_2", "administrative_area_level_1"),
      district: findComp("sublocality_level_1", "sublocality_level_2", "sublocality", "neighborhood"),
      street: findComp("route"),
      region: findComp("administrative_area_level_1"),
      national_address: addr,
      latitude: typeof loc?.latitude === "number" ? String(loc.latitude) : null,
      longitude: typeof loc?.longitude === "number" ? String(loc.longitude) : null,
      working_hours: oh?.weekdayDescriptions ? JSON.stringify(oh.weekdayDescriptions) : null,
      logo_url: (p.iconMaskBaseUri as string) ?? null,
    };
    return {
      fields,
      raw: {
        placeId: (p.id as string) ?? placeId,
        addressComponents: comp as Array<Record<string, unknown>>,
        placeRaw: p,
      },
    };
  } catch {
    return { fields: {}, raw: { placeId, addressComponents: [], placeRaw: null } };
  }
}

// Reverse-geocode fallback when Places Details did not provide district / street.
// Calls the legacy Geocoding API (latlng) — it generally returns richer
// neighborhood / route components for Saudi addresses than Places Details.
async function geocodeFallback(
  lat: string | null,
  lng: string | null,
  googleKey: string,
  lovableKey: string,
): Promise<{
  fields: { city: string | null; district: string | null; street: string | null; region: string | null };
  raw: Array<Record<string, unknown>>;
}> {
  if (!lat || !lng) return { fields: { city: null, district: null, street: null, region: null }, raw: [] };
  try {
    const res = await fetch(
      `https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json?latlng=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&language=ar&region=sa`,
      {
        headers: {
          "Authorization": `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": googleKey,
        },
      },
    );
    if (!res.ok) {
      await res.text().catch(() => "");
      return { fields: { city: null, district: null, street: null, region: null }, raw: [] };
    }
    const data = await res.json().catch(() => null) as { results?: Array<{ address_components?: Array<{ long_name?: string; short_name?: string; types?: string[] }> }> };
    const results = Array.isArray(data?.results) ? data!.results! : [];
    // Aggregate components across all returned results.
    const all = results.flatMap((r) => Array.isArray(r.address_components) ? r.address_components! : []);
    const find = (...types: string[]): string | null => {
      for (const t of types) {
        const c = all.find((c) => Array.isArray(c.types) && c.types!.includes(t));
        if (c) return c.long_name ?? c.short_name ?? null;
      }
      return null;
    };
    return {
      fields: {
        city: find("locality", "postal_town", "administrative_area_level_2"),
        district: find("sublocality_level_1", "sublocality_level_2", "sublocality", "neighborhood"),
        street: find("route"),
        region: find("administrative_area_level_1"),
      },
      raw: all as Array<Record<string, unknown>>,
    };
  } catch {
    return { fields: { city: null, district: null, street: null, region: null }, raw: [] };
  }
}

// Normalize Arabic / English text for fuzzy matching.
function norm(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toString()
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u064B-\u0652]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenMatch(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.includes(nb) || nb.includes(na);
}

// Match a city name against the active `cities` table, return canonical row.
async function matchCity(
  svc: ReturnType<typeof createClient> | null,
  city: string | null,
): Promise<{ id: string; name_ar: string; name_en: string } | null> {
  if (!svc || !city) return null;
  const { data } = await svc
    .from("cities")
    .select("id, name_ar, name_en")
    .eq("is_active", true);
  if (!Array.isArray(data)) return null;
  for (const row of data as Array<{ id: string; name_ar: string; name_en: string }>) {
    if (tokenMatch(row.name_ar ?? "", city) || tokenMatch(row.name_en ?? "", city)) {
      return row;
    }
  }
  return null;
}

// Match district by city + district text against `districts` table.
async function matchDistrict(
  svc: ReturnType<typeof createClient> | null,
  cityName: string | null,
  districtName: string | null,
): Promise<{ id: string; district_ar: string; district_en: string | null; region_ar: string | null; region_en: string | null; city_ar: string | null; city_en: string | null } | null> {
  if (!svc || !districtName) return null;
  let q = svc.from("districts").select("id, district_ar, district_en, region_ar, region_en, city_ar, city_en, city").eq("is_active", true).limit(500);
  if (cityName) {
    // try filter to candidates of the matched city (best-effort, ILIKE either ar or en)
    q = q.or(`city_ar.ilike.%${cityName}%,city_en.ilike.%${cityName}%`);
  }
  const { data } = await q;
  if (!Array.isArray(data)) return null;
  for (const row of data as Array<{ id: string; district_ar: string; district_en: string | null; region_ar: string | null; region_en: string | null; city_ar: string | null; city_en: string | null }>) {
    if (tokenMatch(row.district_ar ?? "", districtName) || tokenMatch(row.district_en ?? "", districtName)) {
      return row;
    }
  }
  return null;
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
      bypassCache?: boolean;
      placeId?: string;
    };
    const website = safeUrl(body.website);
    const mapsUrl = safeUrl(body.mapsUrl);
    const placeId = typeof body.placeId === "string" && /^[A-Za-z0-9_-]{4,200}$/.test(body.placeId.trim())
      ? body.placeId.trim()
      : null;
    const bypassCache = body.bypassCache === true;
    if (!website && !mapsUrl && !placeId) {
      return json({ error: "no_sources" }, 400);
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY") ?? "";
    const googleKey = Deno.env.get("GOOGLE_MAPS_API_KEY") ?? "";
    const lovableKey = Deno.env.get("LOVABLE_API_KEY") ?? "";

    const missing: string[] = [];
    if (website && !firecrawlKey) missing.push("FIRECRAWL_API_KEY");
    if ((mapsUrl || placeId) && (!googleKey || !lovableKey)) missing.push("GOOGLE_MAPS_API_KEY");

    // Cache lookup per source (service-role client to bypass RLS).
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const svc = serviceKey ? createClient(supabaseUrl, serviceKey) : null;
    const readCache = async (key: string): Promise<Record<string, string | null> | null> => {
      if (!svc || bypassCache) return null;
      const { data } = await svc
        .from("admin_enrichment_cache")
        .select("payload, expires_at")
        .eq("cache_key", key)
        .maybeSingle();
      if (data && new Date(data.expires_at) > new Date()) {
        return data.payload as Record<string, string | null>;
      }
      return null;
    };
    const writeCache = async (key: string, payload: Record<string, string | null>) => {
      if (!svc) return;
      const expires = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
      await svc.from("admin_enrichment_cache").upsert({ cache_key: key, payload, expires_at: expires });
    };

    let websiteData: Record<string, string | null> = {};
    if (website && firecrawlKey) {
      const wKey = `web:${website}`;
      const cached = await readCache(wKey);
      if (cached) websiteData = cached;
      else {
        websiteData = await fetchWebsite(website, firecrawlKey);
        if (Object.keys(websiteData).length) await writeCache(wKey, websiteData);
      }
    }
    let mapsData: Record<string, string | null> = {};
    let mapsRaw: { placeId: string | null; addressComponents: Array<Record<string, unknown>>; placeRaw: Record<string, unknown> | null } = { placeId: null, addressComponents: [], placeRaw: null };
    let geocodingRaw: Array<Record<string, unknown>> = [];
    let geocodingUsed = false;
    if ((placeId || mapsUrl) && googleKey && lovableKey) {
      const mKey = `maps:${placeId ? `id:${placeId}` : mapsUrl}`;
      const cached = await readCache(mKey);
      if (cached) {
        mapsData = (cached as Record<string, unknown>).fields as Record<string, string | null> ?? cached;
        mapsRaw = ((cached as Record<string, unknown>).raw as typeof mapsRaw) ?? mapsRaw;
        geocodingRaw = ((cached as Record<string, unknown>).geocodingRaw as Array<Record<string, unknown>>) ?? [];
      } else {
        const r = await fetchGoogleMaps(mapsUrl, placeId, googleKey, lovableKey);
        mapsData = r.fields;
        mapsRaw = r.raw;
        // Geocoding fallback when key address fields are missing.
        const needsGeocode = (!mapsData.district || !mapsData.street || !mapsData.city) && mapsData.latitude && mapsData.longitude;
        if (needsGeocode) {
          const g = await geocodeFallback(mapsData.latitude, mapsData.longitude, googleKey, lovableKey);
          geocodingUsed = true;
          geocodingRaw = g.raw;
          if (!mapsData.city) mapsData.city = g.fields.city;
          if (!mapsData.district) mapsData.district = g.fields.district;
          if (!mapsData.street) mapsData.street = g.fields.street;
          if (!mapsData.region) mapsData.region = g.fields.region;
        }
        if (Object.keys(mapsData).length) {
          await writeCache(mKey, { fields: mapsData, raw: mapsRaw, geocodingRaw } as unknown as Record<string, string | null>);
        }
      }
    }

    // DB matching: snap city / district / region to canonical reference rows.
    const cityMatch = await matchCity(svc, mapsData.city ?? null);
    const districtMatch = await matchDistrict(
      svc,
      cityMatch?.name_ar ?? cityMatch?.name_en ?? mapsData.city ?? null,
      mapsData.district ?? null,
    );
    const dbMatches = {
      city: cityMatch
        ? { id: cityMatch.id, name_ar: cityMatch.name_ar, name_en: cityMatch.name_en }
        : null,
      district: districtMatch
        ? {
            id: districtMatch.id,
            name_ar: districtMatch.district_ar,
            name_en: districtMatch.district_en,
          }
        : null,
      region: districtMatch
        ? { name_ar: districtMatch.region_ar, name_en: districtMatch.region_en }
        : (mapsData.region ? { name_ar: mapsData.region, name_en: mapsData.region } : null),
    };
    // Override merged values with canonical names so admin works on DB-snapped data.
    if (cityMatch) mapsData.city = cityMatch.name_ar || cityMatch.name_en;
    if (districtMatch) mapsData.district = districtMatch.district_ar || districtMatch.district_en;

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
        maps_url: mapsUrl ?? (placeId ? `place_id:${placeId}` : null),
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
      diagnostics: {
        place_id: mapsRaw.placeId,
        addressComponents: mapsRaw.addressComponents,
        geocoding_used: geocodingUsed,
        geocoding_components: geocodingRaw,
      },
      db_matches: dbMatches,
    });
  } catch {
    return json({ error: "internal_error" }, 200);
  }
});