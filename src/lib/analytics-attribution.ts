/**
 * Lightweight attribution helper — UTM + referrer capture for Qitaat.
 *
 * Privacy contract:
 *  - Stored in localStorage under `qitaat_attribution_v1`.
 *  - NEVER captures PII. Only utm_*, referrer hostname, landing path.
 *  - landing_path = pathname only (no query, no hash) — query is dropped
 *    to avoid accidentally storing tokens, emails, or codes.
 *  - referrer_domain = hostname only (no path, no query).
 *  - Values are length-capped and sanitized (alnum + a few separators).
 *  - Read-only consumers should call `getAttributionPayload()` which
 *    returns an analytics-event-safe payload.
 *
 * Storage shape:
 * {
 *   utm_source, utm_medium, utm_campaign, utm_content, utm_term,
 *   referrer_domain, landing_path,
 *   first_touch_at, last_touch_at
 * }
 *
 * first_touch is written ONCE on the very first visit and never overwritten.
 * last_touch is updated whenever a fresh UTM tag arrives on a later visit.
 */

export const ATTRIBUTION_KEY = "qitaat_attribution_v1";

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

type UtmKey = (typeof UTM_KEYS)[number];

export interface StoredAttribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer_domain?: string;
  landing_path?: string;
  first_touch_at?: string;
  last_touch_at?: string;
}

const SAFE_VALUE_RE = /^[\w.\-/]{1,80}$/;
const PII_RE = /(\b[\w.+-]+@[\w-]+\.[\w.-]+\b)|(\+?\d[\d\s\-()]{6,}\d)/;

function sanitize(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().slice(0, 80);
  if (!trimmed) return undefined;
  if (PII_RE.test(trimmed)) return undefined;
  // Allow only alnum + . _ - / — drops anything URL-encoded or weird.
  if (!SAFE_VALUE_RE.test(trimmed)) {
    // Fall back to a stripped version that keeps only safe chars.
    const stripped = trimmed.replace(/[^\w.\-/]/g, "").slice(0, 80);
    return stripped || undefined;
  }
  return trimmed;
}

function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function read(): StoredAttribution {
  const ls = safeStorage();
  if (!ls) return {};
  try {
    const raw = ls.getItem(ATTRIBUTION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as StoredAttribution;
  } catch {
    return {};
  }
}

function write(next: StoredAttribution): void {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode — silent no-op */
  }
}

function readUtmFromUrl(): Partial<Record<UtmKey, string>> {
  if (typeof window === "undefined") return {};
  try {
    const params = new URL(window.location.href).searchParams;
    const out: Partial<Record<UtmKey, string>> = {};
    for (const k of UTM_KEYS) {
      const v = sanitize(params.get(k));
      if (v) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function readReferrerDomain(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const ref = document.referrer;
  if (!ref) return undefined;
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (!host) return undefined;
    // Don't store our own host as referrer (internal navigation).
    if (typeof window !== "undefined" && host === window.location.hostname.replace(/^www\./, "")) {
      return undefined;
    }
    return sanitize(host);
  } catch {
    return undefined;
  }
}

function readLandingPath(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    // Path only — no query, no hash. Capped at 80 chars.
    return sanitize(window.location.pathname);
  } catch {
    return undefined;
  }
}

/**
 * Capture attribution on app boot. Idempotent + safe to call repeatedly.
 *
 * - Writes first_touch ONCE.
 * - Updates last_touch only when a fresh UTM is present in the URL.
 * - Never overwrites existing UTMs unless a new utm_source arrives.
 */
export function captureAttribution(): void {
  const incomingUtm = readUtmFromUrl();
  const hasIncomingUtm = Object.keys(incomingUtm).length > 0;
  const stored = read();
  const nowIso = new Date().toISOString();

  // First visit ever → seed first_touch with whatever we can capture.
  if (!stored.first_touch_at) {
    const seeded: StoredAttribution = {
      ...incomingUtm,
      referrer_domain: readReferrerDomain(),
      landing_path: readLandingPath(),
      first_touch_at: nowIso,
      last_touch_at: nowIso,
    };
    // Strip undefined keys
    write(stripUndefined(seeded));
    return;
  }

  // Returning visit with a fresh UTM tag → refresh last_touch + UTMs.
  if (hasIncomingUtm) {
    const next: StoredAttribution = {
      ...stored,
      ...incomingUtm,
      // Refresh referrer/landing on fresh campaign hit too — useful for last-touch.
      referrer_domain: readReferrerDomain() ?? stored.referrer_domain,
      landing_path: readLandingPath() ?? stored.landing_path,
      last_touch_at: nowIso,
    };
    write(stripUndefined(next));
  }
  // Otherwise: do nothing. Preserve original first_touch + UTMs.
}

function stripUndefined(obj: StoredAttribution): StoredAttribution {
  const out: StoredAttribution = {};
  (Object.keys(obj) as (keyof StoredAttribution)[]).forEach((k) => {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== "") {
      // assignment is type-safe because we read from the same object
      (out as Record<string, string>)[k] = v;
    }
  });
  return out;
}

/**
 * Returns an analytics-event-safe payload with attribution params.
 * Caller is expected to spread this into a `trackEvent` payload —
 * only the attribution allow-listed params will reach the dataLayer.
 */
export function getAttributionPayload(): Record<string, string> {
  const a = read();
  const out: Record<string, string> = {};
  for (const k of UTM_KEYS) {
    const v = a[k];
    if (v) out[k] = v;
  }
  if (a.referrer_domain) out.referrer_domain = a.referrer_domain;
  if (a.landing_path) out.landing_path = a.landing_path;
  if (a.first_touch_at) out.first_touch = a.first_touch_at;
  if (a.last_touch_at) out.last_touch = a.last_touch_at;
  return out;
}