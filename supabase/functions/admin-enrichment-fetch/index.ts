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

const DEFAULT_GOOGLE_REFERER = "https://qitaat.lovable.app/";

type Source = "website" | "google_maps" | "ai_enhanced" | "manual";
type Confidence = "high" | "medium" | "low";
type DbSelectQuery = PromiseLike<{ data: unknown }> & {
  eq: (column: string, value: unknown) => DbSelectQuery;
  limit: (count: number) => DbSelectQuery;
  or: (filters: string) => DbSelectQuery;
  maybeSingle: () => PromiseLike<{ data: unknown }>;
};
type DbFromQuery = {
  select: (columns: string) => DbSelectQuery;
  upsert: (payload: unknown) => PromiseLike<{ data: unknown; error: unknown }>;
};
type DbLike = { from: (table: string) => DbFromQuery };

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

function googleGatewayHeaders(googleKey: string, lovableKey: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    "Authorization": `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": googleKey,
    "Referer": Deno.env.get("GOOGLE_MAPS_HTTP_REFERER") ?? DEFAULT_GOOGLE_REFERER,
    ...extra,
  };
}

function extractLatLng(input: string | null): { lat: string; lng: string } | null {
  if (!input) return null;
  const decoded = decodeURIComponent(input);
  const patterns = [
    /[?&]query=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i,
  ];
  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (match?.[1] && match?.[2]) return { lat: match[1], lng: match[2] };
  }
  return null;
}

function emptyField(): EnrichmentField {
  return { value: null, source: "manual", confidence: "low" };
}

function emptyDraft(): MergedDraft {
  const f = () => emptyField();
  return {
    name_ar: f(), name_en: f(),
    activity: f(), activity_ar: f(), activity_en: f(),
    description_ar: f(), description_en: f(),
    phone: f(), phone_mobile: f(), phone_landline: f(),
    unified_number: f(), whatsapp: f(), customer_service: f(), email: f(),
    website: f(),
    city: f(), city_en: f(),
    district: f(), district_en: f(),
    street: f(), street_en: f(),
    national_address: f(), national_address_en: f(),
    latitude: f(), longitude: f(),
    working_hours: f(), logo_url: f(),
    social_links: f(),
    facebook: f(), instagram: f(), twitter: f(), linkedin: f(),
    youtube: f(), tiktok: f(), snapchat: f(),
  };
}

function isArabic(s: string | null | undefined): boolean {
  if (!s) return false;
  return /[\u0600-\u06FF]/.test(s);
}

function parseSAPhones(text: string): {
  mobile: string[];
  landline: string[];
  unified: string[];
  customer_service: string[];
} {
  const out = { mobile: [] as string[], landline: [] as string[], unified: [] as string[], customer_service: [] as string[] };
  if (!text) return out;
  // Match runs of digits/spaces/dashes with optional +966/00966/0 prefix.
  const re = /(?:\+?966|00966)?[\s-]*0?\d[\d\s-]{6,14}\d/g;
  const seen = new Set<string>();
  const matches = text.match(re) ?? [];
  for (const raw of matches) {
    let d = raw.replace(/[^\d+]/g, "");
    if (d.startsWith("00966")) d = "+966" + d.slice(5);
    else if (d.startsWith("966") && !d.startsWith("+")) d = "+966" + d.slice(3);
    // Normalize to local-form (0XXXXXXXXX) for classification.
    let local = d;
    if (local.startsWith("+966")) local = "0" + local.slice(4);
    if (seen.has(local)) continue;
    seen.add(local);
    if (/^9200\d{4,6}$/.test(local)) out.unified.push(local);
    else if (/^920\d{6}$/.test(local) || /^800\d{6,7}$/.test(local)) out.unified.push(local);
    else if (/^05\d{8}$/.test(local)) out.mobile.push(local);
    else if (/^01\d{7,8}$/.test(local) || /^0[2-4]\d{7}$/.test(local)) out.landline.push(local);
  }
  // Heuristic: phones appearing near "customer", "خدمة العملاء", "support" tags.
  const csCtx = text.match(/(?:customer|خدمة\s*العملاء|عملاء|support)[^\n]{0,80}/gi) ?? [];
  for (const ctx of csCtx) {
    const p = parseSAPhones(ctx);
    out.customer_service.push(...p.mobile, ...p.landline, ...p.unified);
  }
  return out;
}

function parseEmails(text: string): string[] {
  if (!text) return [];
  const re = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const list = (text.match(re) ?? []).map((s) => s.toLowerCase());
  return Array.from(new Set(list)).slice(0, 5);
}

function classifySocials(urls: string[]): {
  facebook: string | null; instagram: string | null; twitter: string | null;
  linkedin: string | null; youtube: string | null; tiktok: string | null;
  snapchat: string | null; whatsapp: string | null;
} {
  const r = {
    facebook: null as string | null, instagram: null as string | null, twitter: null as string | null,
    linkedin: null as string | null, youtube: null as string | null, tiktok: null as string | null,
    snapchat: null as string | null, whatsapp: null as string | null,
  };
  for (const l of urls) {
    if (!l || typeof l !== "string") continue;
    if (!r.facebook && /facebook\.com/i.test(l)) r.facebook = l;
    else if (!r.instagram && /instagram\.com/i.test(l)) r.instagram = l;
    else if (!r.twitter && /(?:^|\/\/)(?:www\.)?(?:twitter|x)\.com/i.test(l)) r.twitter = l;
    else if (!r.linkedin && /linkedin\.com/i.test(l)) r.linkedin = l;
    else if (!r.youtube && /(youtube\.com|youtu\.be)/i.test(l)) r.youtube = l;
    else if (!r.tiktok && /tiktok\.com/i.test(l)) r.tiktok = l;
    else if (!r.snapchat && /snapchat\.com/i.test(l)) r.snapchat = l;
    else if (!r.whatsapp && /(wa\.me|whatsapp\.com|api\.whatsapp)/i.test(l)) r.whatsapp = l;
  }
  return r;
}

async function fetchWebsite(
  url: string,
  firecrawlKey: string,
): Promise<Record<string, string | null>> {
  try {
    // Pull markdown + html + links from up to 3 pages: home, /contact*, /about*.
    // We then run a single Firecrawl LLM-extract pass over the concatenated
    // content using a strict JSON schema. This is FAR more accurate than
    // pulling fields from <title>/<meta description> alone.
    const baseUrl = new URL(url);
    const origin = baseUrl.origin;

    async function scrapeOne(target: string): Promise<{ md: string; meta: Record<string, unknown>; links: string[] }> {
      try {
        const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: target,
            formats: ["markdown", "links"],
            onlyMainContent: false,
            waitFor: 1200,
          }),
        });
        if (!r.ok) return { md: "", meta: {}, links: [] };
        const d = await r.json().catch(() => null);
        return {
          md: (d?.markdown || d?.data?.markdown) ?? "",
          meta: (d?.metadata || d?.data?.metadata) ?? {},
          links: (d?.links || d?.data?.links) ?? [],
        };
      } catch {
        return { md: "", meta: {}, links: [] };
      }
    }

    // 1) Scrape home
    const home = await scrapeOne(url);
    const allLinks: string[] = Array.isArray(home.links) ? [...home.links] : [];
    const meta = home.meta as Record<string, string | undefined>;

    // 2) Discover contact / about pages from the home page's links
    const sameOrigin = (l: string): boolean => {
      try { return new URL(l, origin).origin === origin; } catch { return false; }
    };
    const pickPage = (rx: RegExp): string | null => {
      const m = allLinks.find((l) => typeof l === "string" && sameOrigin(l) && rx.test(l));
      return m ?? null;
    };
    const contactUrl = pickPage(/(contact|تواصل|اتصل|اتصال)/i);
    const aboutUrl = pickPage(/(about|من-?نحن|عن(?:نا|-?الشركة))/i);

    const extras = await Promise.all(
      [contactUrl, aboutUrl].filter((u): u is string => !!u && u !== url).slice(0, 2).map(scrapeOne),
    );

    // Concatenate content (cap to keep prompt size reasonable).
    const combinedMd = [home.md, ...extras.map((e) => e.md)].join("\n\n---\n\n").slice(0, 28000);
    for (const e of extras) {
      if (Array.isArray(e.links)) allLinks.push(...e.links);
    }

    // 3) Regex baseline (fallback + augmentation).
    const phones = parseSAPhones(combinedMd);
    const emails = parseEmails(combinedMd);
    const socials = classifySocials(allLinks);
    const rawTitle = typeof meta.title === "string" ? meta.title.trim() : null;
    const rawDesc = typeof meta.description === "string" ? meta.description.trim() : null;
    const ogImage = typeof meta["og:image"] === "string" ? meta["og:image"] as string : null;

    // 4) Firecrawl LLM extract (structured JSON) over the combined content.
    const llm: Record<string, string | null> = {};
    try {
      const schema = {
        type: "object",
        properties: {
          name_ar: { type: "string", description: "Arabic business / brand name only (no slogans, no address)." },
          name_en: { type: "string", description: "English business / brand name only." },
          description_ar: { type: "string", description: "Arabic business description, 1-3 sentences, professional tone, no markdown." },
          description_en: { type: "string", description: "English business description, 1-3 sentences, professional tone, no markdown." },
          activity_ar: { type: "string", description: "Main activity / category in Arabic (e.g. مصنع ألمنيوم، ورشة زجاج، مقاول)." },
          activity_en: { type: "string", description: "Main activity / category in English (e.g. aluminum factory, glass workshop)." },
          services_ar: { type: "string", description: "Comma-separated list of services offered, in Arabic." },
          services_en: { type: "string", description: "Comma-separated list of services offered, in English." },
          phone_mobile: { type: "string", description: "Saudi mobile phone in +9665XXXXXXXX or 05XXXXXXXX form." },
          phone_landline: { type: "string", description: "Saudi landline in 0XXXXXXXXX form." },
          unified_number: { type: "string", description: "Unified Saudi number starting 920 / 800 / 9200." },
          whatsapp: { type: "string", description: "WhatsApp number or wa.me link." },
          customer_service: { type: "string", description: "Customer service phone if labeled as such." },
          email: { type: "string", description: "Primary contact email." },
          city: { type: "string", description: "Saudi city in Arabic." },
          city_en: { type: "string", description: "Saudi city in English." },
          district: { type: "string", description: "District / neighborhood in Arabic." },
          street: { type: "string", description: "Street in Arabic." },
          national_address: { type: "string", description: "Full Saudi National Address line if present." },
          working_hours: { type: "string", description: "Working hours summary as plain text (e.g. 'السبت-الخميس 8ص-5م')." },
          facebook: { type: "string" }, instagram: { type: "string" },
          twitter: { type: "string" }, linkedin: { type: "string" },
          youtube: { type: "string" }, tiktok: { type: "string" },
          snapchat: { type: "string" },
        },
      };
      const ex = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          formats: [{
            type: "json",
            schema,
            prompt:
              "You are extracting verified facts about a Saudi industrial business from its website. " +
              "Read the combined page content carefully (home + contact + about). " +
              "Return ONLY facts that explicitly appear in the content — never invent. " +
              "If a field is not present, return an empty string for it. " +
              "name_* MUST be the brand/business name only (not the page title). " +
              "description_* MUST be a real description of what the business does, not the address. " +
              "Phone numbers MUST be classified correctly: mobile = 05XX, landline = 01-04XX, unified = 920/800/9200. " +
              "Arabic must be Modern Standard, no emojis, no markdown.",
          }],
          onlyMainContent: false,
          waitFor: 1200,
        }),
      });
      if (ex.ok) {
        const d = await ex.json().catch(() => null);
        const j = (d?.json || d?.data?.json) as Record<string, string> | undefined;
        if (j && typeof j === "object") {
          for (const [k, v] of Object.entries(j)) {
            if (typeof v === "string" && v.trim()) llm[k] = v.trim();
          }
        }
      } else {
        await ex.text().catch(() => "");
      }
    } catch {
      // ignore — fallback to regex baseline below
    }

    const pick = (...vals: Array<string | null | undefined>): string | null => {
      for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
      return null;
    };

    // 5) Merge: LLM wins; fall back to regex / meta.
    return {
      name_ar: pick(llm.name_ar, isArabic(rawTitle) ? rawTitle : null),
      name_en: pick(llm.name_en, rawTitle && !isArabic(rawTitle) ? rawTitle : null),
      description_ar: pick(llm.description_ar, isArabic(rawDesc) ? rawDesc : null),
      description_en: pick(llm.description_en, rawDesc && !isArabic(rawDesc) ? rawDesc : null),
      activity_ar: pick(llm.activity_ar),
      activity_en: pick(llm.activity_en),
      services_ar: pick(llm.services_ar),
      services_en: pick(llm.services_en),
      phone: pick(llm.phone_mobile, llm.phone_landline, llm.unified_number,
        phones.mobile[0], phones.landline[0], phones.unified[0]),
      phone_mobile: pick(llm.phone_mobile, phones.mobile[0]),
      phone_landline: pick(llm.phone_landline, phones.landline[0]),
      unified_number: pick(llm.unified_number, phones.unified[0]),
      customer_service: pick(llm.customer_service, phones.customer_service[0]),
      whatsapp: pick(llm.whatsapp, socials.whatsapp),
      email: pick(llm.email, emails[0]),
      website: url,
      city: pick(llm.city),
      city_en: pick(llm.city_en),
      district: pick(llm.district),
      street: pick(llm.street),
      national_address: pick(llm.national_address),
      working_hours: pick(llm.working_hours),
      logo_url: pick(ogImage),
      facebook: pick(llm.facebook, socials.facebook),
      instagram: pick(llm.instagram, socials.instagram),
      twitter: pick(llm.twitter, socials.twitter),
      linkedin: pick(llm.linkedin, socials.linkedin),
      youtube: pick(llm.youtube, socials.youtube),
      tiktok: pick(llm.tiktok, socials.tiktok),
      snapchat: pick(llm.snapchat, socials.snapchat),
      social_links: JSON.stringify(socials),
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
  lang: "ar" | "en" = "ar",
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
        `https://connector-gateway.lovable.dev/google_maps/places/v1/places/${encodeURIComponent(placeId)}?languageCode=${lang}`,
        {
          method: "GET",
          headers: googleGatewayHeaders(googleKey, lovableKey, { "X-Goog-FieldMask": fieldMask }),
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
          headers: googleGatewayHeaders(googleKey, lovableKey, {
            "Content-Type": "application/json",
            "X-Goog-FieldMask": fieldMask.split(",").map((f) => `places.${f}`).join(","),
          }),
          body: JSON.stringify({ textQuery: url, languageCode: lang }),
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
    const ohFull = p.regularOpeningHours as { weekdayDescriptions?: string[]; periods?: unknown } | undefined;
    const fields = {
      name,
      activity: (p.primaryType as string) ?? null,
      // IMPORTANT: do NOT shove the address into description — that field is
      // for a business description; the address has its own field.
      description: null,
      phone: (p.internationalPhoneNumber as string) ?? (p.nationalPhoneNumber as string) ?? null,
      website: (p.websiteUri as string) ?? null,
      city: findComp("locality", "postal_town", "administrative_area_level_2", "administrative_area_level_1"),
      district: findComp("sublocality_level_1", "sublocality_level_2", "sublocality", "neighborhood"),
      street: findComp("route"),
      region: findComp("administrative_area_level_1"),
      national_address: addr,
      latitude: typeof loc?.latitude === "number" ? String(loc.latitude) : null,
      longitude: typeof loc?.longitude === "number" ? String(loc.longitude) : null,
      working_hours: ohFull?.weekdayDescriptions || ohFull?.periods
        ? JSON.stringify({
            weekdayDescriptions: ohFull?.weekdayDescriptions ?? [],
            periods: ohFull?.periods ?? [],
          })
        : null,
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
  lang: "ar" | "en" = "ar",
): Promise<{
  fields: { city: string | null; district: string | null; street: string | null; region: string | null; national_address: string | null; latitude: string | null; longitude: string | null };
  raw: Array<Record<string, unknown>>;
}> {
  if (!lat || !lng) return { fields: { city: null, district: null, street: null, region: null, national_address: null, latitude: null, longitude: null }, raw: [] };
  try {
    const res = await fetch(
      `https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json?latlng=${encodeURIComponent(lat)},${encodeURIComponent(lng)}&language=${lang}&region=sa`,
      { headers: googleGatewayHeaders(googleKey, lovableKey) },
    );
    if (!res.ok) {
      await res.text().catch(() => "");
      return { fields: { city: null, district: null, street: null, region: null, national_address: null, latitude: lat, longitude: lng }, raw: [] };
    }
    const data = await res.json().catch(() => null) as { results?: Array<{ formatted_address?: string; address_components?: Array<{ long_name?: string; short_name?: string; types?: string[] }> }> };
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
        national_address: results[0]?.formatted_address ?? null,
        latitude: lat,
        longitude: lng,
      },
      raw: all as Array<Record<string, unknown>>,
    };
  } catch {
    return { fields: { city: null, district: null, street: null, region: null, national_address: null, latitude: lat, longitude: lng }, raw: [] };
  }
}

function geocodeFallbackEn(
  lat: string | null,
  lng: string | null,
  googleKey: string,
  lovableKey: string,
) {
  return geocodeFallback(lat, lng, googleKey, lovableKey, "en");
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
  svc: DbLike | null,
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
  svc: DbLike | null,
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
    const svc: DbLike | null = serviceKey ? createClient(supabaseUrl, serviceKey) as unknown as DbLike : null;
    const readCache = async (key: string): Promise<Record<string, string | null> | null> => {
      if (!svc || bypassCache) return null;
      const { data } = await svc
        .from("admin_enrichment_cache")
        .select("payload, expires_at")
        .eq("cache_key", key)
        .maybeSingle();
      const row = data as { payload?: unknown; expires_at?: string } | null;
      if (row?.expires_at && new Date(row.expires_at) > new Date()) {
        return row.payload as Record<string, string | null>;
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
      const wKey = `web:v2:${website}`;
      const cached = await readCache(wKey);
      if (cached) websiteData = cached;
      else {
        websiteData = await fetchWebsite(website, firecrawlKey);
        if (Object.keys(websiteData).length) await writeCache(wKey, websiteData);
      }
    }
    let mapsData: Record<string, string | null> = {};
    let mapsDataEn: Record<string, string | null> = {};
    let mapsRaw: { placeId: string | null; addressComponents: Array<Record<string, unknown>>; placeRaw: Record<string, unknown> | null } = { placeId: null, addressComponents: [], placeRaw: null };
    let geocodingRaw: Array<Record<string, unknown>> = [];
    let geocodingUsed = false;
    if ((placeId || mapsUrl) && googleKey && lovableKey) {
      const mKey = `maps:${placeId ? `id:${placeId}` : mapsUrl}:v2`;
      const cached = await readCache(mKey);
      if (cached) {
        const c = cached as Record<string, unknown>;
        mapsData = (c.fields as Record<string, string | null>) ?? {};
        mapsDataEn = (c.fieldsEn as Record<string, string | null>) ?? {};
        mapsRaw = (c.raw as typeof mapsRaw) ?? mapsRaw;
        geocodingRaw = (c.geocodingRaw as Array<Record<string, unknown>>) ?? [];
      } else {
        // Fetch BOTH languages so names + address can be assigned to the correct side.
        const [rAr, rEn] = await Promise.all([
          fetchGoogleMaps(mapsUrl, placeId, googleKey, lovableKey, "ar"),
          fetchGoogleMaps(mapsUrl, placeId, googleKey, lovableKey, "en"),
        ]);
        mapsData = rAr.fields;
        mapsDataEn = rEn.fields;
        mapsRaw = rAr.raw.placeId ? rAr.raw : rEn.raw;
        const urlCoords = extractLatLng(mapsUrl);
        if (urlCoords && (!mapsData.latitude || !mapsData.longitude) && (!mapsDataEn.latitude || !mapsDataEn.longitude)) {
          mapsData.latitude = urlCoords.lat;
          mapsData.longitude = urlCoords.lng;
          mapsDataEn.latitude = urlCoords.lat;
          mapsDataEn.longitude = urlCoords.lng;
        }
        // Geocoding fallback when key address fields are missing (in either language).
        const lat = mapsData.latitude ?? mapsDataEn.latitude ?? null;
        const lng = mapsData.longitude ?? mapsDataEn.longitude ?? null;
        const needsGeocode = (!mapsData.district || !mapsData.street || !mapsData.city ||
          !mapsDataEn.district || !mapsDataEn.street || !mapsDataEn.city) && lat && lng;
        if (needsGeocode) {
          const [gAr, gEn] = await Promise.all([
            geocodeFallback(lat, lng, googleKey, lovableKey),
            geocodeFallbackEn(lat, lng, googleKey, lovableKey),
          ]);
          geocodingUsed = true;
          geocodingRaw = gAr.raw;
          if (!mapsData.city) mapsData.city = gAr.fields.city;
          if (!mapsData.district) mapsData.district = gAr.fields.district;
          if (!mapsData.street) mapsData.street = gAr.fields.street;
          if (!mapsData.region) mapsData.region = gAr.fields.region;
          if (!mapsData.national_address) mapsData.national_address = gAr.fields.national_address;
          if (!mapsDataEn.city) mapsDataEn.city = gEn.fields.city;
          if (!mapsDataEn.district) mapsDataEn.district = gEn.fields.district;
          if (!mapsDataEn.street) mapsDataEn.street = gEn.fields.street;
          if (!mapsDataEn.region) mapsDataEn.region = gEn.fields.region;
          if (!mapsDataEn.national_address) mapsDataEn.national_address = gEn.fields.national_address;
        }
        if (Object.keys(mapsData).length || Object.keys(mapsDataEn).length) {
          await writeCache(mKey, { fields: mapsData, fieldsEn: mapsDataEn, raw: mapsRaw, geocodingRaw } as unknown as Record<string, string | null>);
        }
      }
    }

    // Names from Google: route by script. AR call may return the English name
    // when no Arabic translation exists — guard with isArabic().
    const gNameAr = isArabic(mapsData.name) ? mapsData.name : null;
    const gNameEn = mapsDataEn.name && !isArabic(mapsDataEn.name) ? mapsDataEn.name : (mapsData.name && !isArabic(mapsData.name) ? mapsData.name : null);

    // DB matching: snap city / district / region to canonical reference rows.
    const cityMatch = await matchCity(svc, mapsData.city ?? mapsDataEn.city ?? null);
    const districtMatch = await matchDistrict(
      svc,
      cityMatch?.name_ar ?? cityMatch?.name_en ?? mapsData.city ?? mapsDataEn.city ?? null,
      mapsData.district ?? mapsDataEn.district ?? null,
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
    if (cityMatch) { mapsData.city = cityMatch.name_ar; mapsDataEn.city = cityMatch.name_en ?? cityMatch.name_ar; }
    if (districtMatch) {
      mapsData.district = districtMatch.district_ar;
      mapsDataEn.district = districtMatch.district_en ?? districtMatch.district_ar;
    }

    const merged = emptyDraft();
    merged.name_ar = pickField(websiteData.name_ar ?? null, gNameAr);
    merged.name_en = pickField(websiteData.name_en ?? null, gNameEn, true);
    // Activity stays as primaryType (machine-readable). AR/EN copies for admin polish.
    merged.activity = pickField(null, mapsData.activity ?? null);
    merged.activity_ar = pickField(websiteData.activity_ar ?? null, isArabic(mapsData.activity) ? mapsData.activity : null);
    merged.activity_en = pickField(websiteData.activity_en ?? null, !isArabic(mapsDataEn.activity) ? mapsDataEn.activity : null, true);
    // IMPORTANT: descriptions are NOT the formatted address. Only website
    // meta description is a real description (script-routed). AI fills the rest.
    merged.description_ar = pickField(websiteData.description_ar ?? null, null);
    merged.description_en = pickField(websiteData.description_en ?? null, null, true);
    merged.phone = pickField(websiteData.phone ?? null, mapsData.phone ?? null);
    merged.phone_mobile = pickField(websiteData.phone_mobile ?? null, null);
    merged.phone_landline = pickField(websiteData.phone_landline ?? null, mapsData.phone ?? null);
    merged.unified_number = pickField(websiteData.unified_number ?? null, null);
    merged.whatsapp = pickField(websiteData.whatsapp ?? null, null);
    merged.customer_service = pickField(websiteData.customer_service ?? null, null);
    merged.email = pickField(websiteData.email ?? null, null);
    merged.website = pickField(websiteData.website ?? null, mapsData.website ?? null, true);
    merged.city = pickField(websiteData.city ?? null, mapsData.city ?? null);
    merged.city_en = pickField(websiteData.city_en ?? null, mapsDataEn.city ?? null, true);
    merged.district = pickField(websiteData.district ?? null, mapsData.district ?? null);
    merged.district_en = pickField(null, mapsDataEn.district ?? null, true);
    merged.street = pickField(websiteData.street ?? null, mapsData.street ?? null);
    merged.street_en = pickField(null, mapsDataEn.street ?? null, true);
    merged.national_address = pickField(websiteData.national_address ?? null, mapsData.national_address ?? null);
    merged.national_address_en = pickField(null, mapsDataEn.national_address ?? null, true);
    merged.latitude = pickField(null, mapsData.latitude ?? mapsDataEn.latitude ?? null);
    merged.longitude = pickField(null, mapsData.longitude ?? mapsDataEn.longitude ?? null);
    merged.working_hours = pickField(websiteData.working_hours ?? null, mapsData.working_hours ?? mapsDataEn.working_hours ?? null);
    merged.logo_url = pickField(websiteData.logo_url ?? null, mapsData.logo_url ?? null);
    merged.social_links = pickField(websiteData.social_links ?? null, null, true);
    merged.facebook = pickField(websiteData.facebook ?? null, null, true);
    merged.instagram = pickField(websiteData.instagram ?? null, null, true);
    merged.twitter = pickField(websiteData.twitter ?? null, null, true);
    merged.linkedin = pickField(websiteData.linkedin ?? null, null, true);
    merged.youtube = pickField(websiteData.youtube ?? null, null, true);
    merged.tiktok = pickField(websiteData.tiktok ?? null, null, true);
    merged.snapchat = pickField(websiteData.snapchat ?? null, null, true);

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