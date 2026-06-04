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
      key, v: "weekly", libraries: libraries.join(","),
      loading: "async", callback: "__qitaatInitGoogleMaps",
    });
    if (tracking) params.set("channel", tracking);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => reject(new Error("maps_js_load_failed"));
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

export async function searchPlacesBrowserFallback(opts: {
  query: string;
  region?: string;
  language?: string;
  pageSize?: number;
}): Promise<{ results: MapsSearchCandidate[]; detail?: string }> {
  if (typeof window === "undefined") return { results: [], detail: "no_window" };
  await loadMapsJs(["places"]);
  const googleRoot = (window as unknown as { google?: { maps?: { importLibrary?: (library: string) => Promise<unknown> } } }).google;
  const placesLibrary = await googleRoot?.maps?.importLibrary?.("places");
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
  return { results };
}