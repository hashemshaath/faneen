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

let loaderPromise: Promise<typeof google> | null = null;

/**
 * Asynchronously loads the Google Maps JavaScript API. Idempotent.
 */
export function loadMapsJs(libraries: string[] = ["places"]): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject(new Error("no_window"));
  if (loaderPromise) return loaderPromise;
  const key = getBrowserMapsKey();
  if (!key) return Promise.reject(new Error("missing_browser_key"));

  loaderPromise = new Promise((resolve, reject) => {
    // @ts-expect-error global callback wiring
    window.__qitaatInitGoogleMaps = () => resolve((window as unknown as { google: typeof google }).google);
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