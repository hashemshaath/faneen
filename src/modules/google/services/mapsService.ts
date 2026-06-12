// GOOGLE-INTEGRATION-GOVERNANCE-AUDIT-1
// Single source of truth for browser-side Google Maps JS API access.
// The browser key is ONLY allowed to be read here.

const BROWSER_KEY_ENV = "VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY";
const TRACKING_ID_ENV = "VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID";

export function getBrowserMapsKey(): string {
  const k = (import.meta.env as Record<string, string | undefined>)[BROWSER_KEY_ENV];
  return typeof k === "string" ? k : "";
}

export function getMapsTrackingId(): string {
  const k = (import.meta.env as Record<string, string | undefined>)[TRACKING_ID_ENV];
  return typeof k === "string" ? k : "";
}

/**
 * Static Maps URL using the referrer-restricted browser key.
 * Returns null when the key is missing.
 */
export function getStaticMapUrl(opts: {
  lat: number; lng: number; zoom?: number; width?: number; height?: number;
}): string | null {
  const key = getBrowserMapsKey();
  if (!key) return null;
  const z = opts.zoom ?? 15;
  const w = opts.width ?? 120;
  const h = opts.height ?? 80;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${opts.lat},${opts.lng}&zoom=${z}&size=${w}x${h}&scale=2&markers=color:red%7C${opts.lat},${opts.lng}&key=${key}`;
}

export interface MapsSearchCandidate {
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

// Loose typing — we don't ship @types/google.maps; consumers cast as needed.
type MapsNamespace = unknown;
let loaderPromise: Promise<MapsNamespace> | null = null;

/**
 * Asynchronously loads the Google Maps JavaScript API. Idempotent.
 */
export function loadMapsJs(libraries: string[] = ["places"]): Promise<MapsNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("no_window"));
  if (loaderPromise) return loaderPromise;
  const key = getBrowserMapsKey();
  if (!key) return Promise.reject(new Error("missing_browser_key"));

  loaderPromise = new Promise((resolve, reject) => {
    (window as unknown as Record<string, unknown>).__qitaatInitGoogleMaps = () => {
      const g = (window as unknown as { google?: MapsNamespace }).google;
      resolve(g);
    };
    const tracking = getMapsTrackingId();
    const params = new URLSearchParams({
      key, v: "weekly",
      loading: "async", callback: "__qitaatInitGoogleMaps",
    });
    if (libraries.length) params.set("libraries", libraries.join(","));
    if (tracking) params.set("channel", tracking);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      loaderPromise = null;
      reject(new Error("maps_js_load_failed"));
    };
    document.head.appendChild(script);
  });
  return loaderPromise;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readName(value: unknown): string | null {
  const direct = readString(value);
  if (direct) return direct;
  const rec = asRecord(value);
  return readString(rec?.text) ?? readString(rec?.mainText) ?? null;
}

function readLatLng(location: unknown): { latitude: number | null; longitude: number | null } {
  const rec = asRecord(location);
  if (!rec) return { latitude: null, longitude: null };
  const latFn = rec.lat;
  const lngFn = rec.lng;
  const lat = typeof latFn === "function" ? readNumber((latFn as () => unknown)()) : readNumber(rec.lat) ?? readNumber(rec.latitude);
  const lng = typeof lngFn === "function" ? readNumber((lngFn as () => unknown)()) : readNumber(rec.lng) ?? readNumber(rec.longitude);
  return { latitude: lat, longitude: lng };
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

type BrowserGoogleRoot = {
  maps?: {
    importLibrary?: (library: string) => Promise<unknown>;
    Geocoder?: new () => { geocode: (request: Record<string, unknown>) => Promise<unknown> };
  };
};

type GeocodeComponent = { long_name?: string; short_name?: string; types?: string[] };
type GeocodeResult = {
  place_id?: string;
  formatted_address?: string;
  types?: string[];
  geometry?: { location?: unknown };
  address_components?: GeocodeComponent[];
};

function getBrowserGoogle(): BrowserGoogleRoot | undefined {
  return (window as unknown as { google?: BrowserGoogleRoot }).google;
}

function pickAddressComponent(components: GeocodeComponent[] | undefined, ...types: string[]): string | null {
  if (!Array.isArray(components)) return null;
  for (const type of types) {
    const found = components.find((component) => Array.isArray(component.types) && component.types.includes(type));
    if (found?.long_name || found?.short_name) return found.long_name ?? found.short_name ?? null;
  }
  return null;
}

function normalizeFallbackDetail(value: unknown, fallback: string): string {
  if (value instanceof Error) return value.message || fallback;
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

async function searchPlacesAutocomplete(opts: {
  query: string;
  region?: string;
  language?: string;
  pageSize?: number;
}): Promise<{ results: MapsSearchCandidate[]; detail?: string }> {
  await loadMapsJs([]);
  const googleRoot = getBrowserGoogle();
  const placesLibrary = await googleRoot?.maps?.importLibrary?.("places").catch((error: unknown) => {
    throw new Error(normalizeFallbackDetail(error, "browser_places_import_failed"));
  });
  const places = asRecord(placesLibrary);
  const suggestionApi = asRecord(places?.AutocompleteSuggestion);
  const tokenCtor = places?.AutocompleteSessionToken;
  const fetchSuggestions = suggestionApi?.fetchAutocompleteSuggestions;
  if (typeof fetchSuggestions !== "function") return { results: [], detail: "browser_places_unavailable" };
  const sessionToken = typeof tokenCtor === "function" ? new (tokenCtor as new () => unknown)() : undefined;
  const response = await (fetchSuggestions as (request: Record<string, unknown>) => Promise<{ suggestions?: unknown[] }>)({
    input: opts.query,
    includedRegionCodes: [(opts.region ?? "SA").toLowerCase()],
    language: opts.language ?? "ar",
    sessionToken,
  });
  const suggestions = Array.isArray(response.suggestions) ? response.suggestions.slice(0, opts.pageSize ?? 10) : [];
  const results: MapsSearchCandidate[] = [];
  for (const suggestion of suggestions) {
    const prediction = asRecord(asRecord(suggestion)?.placePrediction);
    if (!prediction) continue;
    const toPlace = prediction.toPlace;
    const place = typeof toPlace === "function" ? asRecord((toPlace as () => unknown).call(prediction)) : null;
    const fetchFields = place?.fetchFields;
    if (typeof fetchFields === "function") {
      await (fetchFields as (request: { fields: string[] }) => Promise<unknown>)({
        fields: [
          "id", "displayName", "formattedAddress", "location", "types", "primaryType",
          "rating", "userRatingCount", "websiteURI", "internationalPhoneNumber",
          "nationalPhoneNumber", "googleMapsURI", "businessStatus",
        ],
      }).catch(() => null);
    }
    const location = readLatLng(place?.location);
    const id = readString(place?.id) ?? readString(prediction.placeId) ?? readString(prediction.place_id);
    if (!id) continue;
    results.push({
      place_id: id,
      name: readName(place?.displayName) ?? readName(prediction.text),
      address: readString(place?.formattedAddress) ?? readName(prediction.secondaryText),
      primary_type: readString(place?.primaryType),
      types: readStringArray(place?.types),
      rating: readNumber(place?.rating),
      user_rating_count: readNumber(place?.userRatingCount),
      latitude: location.latitude,
      longitude: location.longitude,
      website: readString(place?.websiteURI) ?? readString(place?.websiteUri),
      phone: readString(place?.internationalPhoneNumber) ?? readString(place?.nationalPhoneNumber),
      maps_url: readString(place?.googleMapsURI) ?? readString(place?.googleMapsUri) ?? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(id)}`,
      icon_url: null,
      business_status: readString(place?.businessStatus),
    });
  }
  return { results, detail: "browser_places" };
}

async function searchPlacesGeocoderFallback(opts: {
  query: string;
  region?: string;
  language?: string;
  pageSize?: number;
}): Promise<{ results: MapsSearchCandidate[]; detail?: string }> {
  await loadMapsJs([]);
  const googleRoot = getBrowserGoogle();
  const geocodingLibrary = await googleRoot?.maps?.importLibrary?.("geocoding").catch(() => null);
  const geocoding = asRecord(geocodingLibrary);
  const GeocoderCtor = geocoding?.Geocoder ?? googleRoot?.maps?.Geocoder;
  if (typeof GeocoderCtor !== "function") return { results: [], detail: "browser_geocoding_unavailable" };
  const geocoder = new (GeocoderCtor as new () => { geocode: (request: Record<string, unknown>) => Promise<unknown> })();
  const response = await geocoder.geocode({
    address: opts.query,
    region: (opts.region ?? "SA").toLowerCase(),
    language: opts.language ?? "ar",
  });
  const records = asRecord(response);
  const rawResults = Array.isArray(records?.results) ? records.results.slice(0, opts.pageSize ?? 10) : [];
  const results = rawResults.map((raw): MapsSearchCandidate | null => {
    const item = asRecord(raw) as GeocodeResult | null;
    if (!item) return null;
    const location = readLatLng(item.geometry?.location);
    const id = readString(item.place_id) ?? `geocode_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
    const label = pickAddressComponent(item.address_components, "establishment", "point_of_interest", "premise")
      ?? readString(item.formatted_address);
    return {
      place_id: id,
      name: label,
      address: readString(item.formatted_address),
      primary_type: Array.isArray(item.types) ? item.types[0] ?? null : null,
      types: readStringArray(item.types),
      rating: null,
      user_rating_count: null,
      latitude: location.latitude,
      longitude: location.longitude,
      website: null,
      phone: null,
      maps_url: location.latitude !== null && location.longitude !== null
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.latitude},${location.longitude}`)}&query_place_id=${encodeURIComponent(id)}`
        : `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(id)}`,
      icon_url: null,
      business_status: null,
    };
  }).filter((item): item is MapsSearchCandidate => item !== null);
  return { results, detail: "browser_geocoding" };
}

export async function searchPlacesBrowserFallback(opts: {
  query: string;
  region?: string;
  language?: string;
  pageSize?: number;
}): Promise<{ results: MapsSearchCandidate[]; detail?: string }> {
  if (typeof window === "undefined") return { results: [], detail: "no_window" };
  const autocomplete = await searchPlacesAutocomplete(opts).catch((error: unknown) => ({
    results: [] as MapsSearchCandidate[],
    detail: normalizeFallbackDetail(error, "browser_places_failed"),
  }));
  if (autocomplete.results.length) return autocomplete;
  const geocoding = await searchPlacesGeocoderFallback(opts).catch((error: unknown) => ({
    results: [] as MapsSearchCandidate[],
    detail: normalizeFallbackDetail(error, "browser_geocoding_failed"),
  }));
  if (geocoding.results.length) return geocoding;
  return {
    results: [],
    detail: [autocomplete.detail, geocoding.detail].filter(Boolean).join(" · ") || "browser_fallback_empty",
  };
}