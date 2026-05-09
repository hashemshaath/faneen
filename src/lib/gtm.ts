/**
 * Google Tag Manager bootstrap — env-driven.
 *
 * Reads container ID from `import.meta.env.VITE_GTM_ID`. If the variable is
 * missing or empty, NOTHING is injected: no Consent Mode init, no gtm.js
 * loader, no <noscript> iframe. This keeps preview/dev environments clean
 * unless the operator explicitly opts in.
 *
 * Order of operations (matches Google's recommendation):
 *   1. Initialize `dataLayer` and push Consent Mode v2 defaults.
 *   2. Inject the async gtm.js loader.
 *   3. Inject the <noscript> iframe fallback into <body>.
 */

type DataLayerWindow = Window & {
  dataLayer?: Array<Record<string, unknown> | IArguments>;
};

const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/;

export function getGtmId(): string | null {
  const raw = (import.meta.env.VITE_GTM_ID ?? "").toString().trim();
  if (!raw) return null;
  if (!GTM_ID_PATTERN.test(raw)) {
    // Invalid format — refuse to load.
    // eslint-disable-next-line no-console
    console.warn(`[gtm] Ignoring invalid VITE_GTM_ID "${raw}" (expected GTM-XXXXXX).`);
    return null;
  }
  return raw;
}

let initialized = false;

export function initGtm(): void {
  if (initialized) return;
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const id = getGtmId();
  if (!id) return; // Requirement #2: do nothing without VITE_GTM_ID.

  initialized = true;
  const w = window as DataLayerWindow;
  w.dataLayer = w.dataLayer ?? [];

  // If GTM is already present in HTML (static load via index.html), skip injection.
  if (document.querySelector('script[src*="googletagmanager.com/gtm.js"]')) {
    return;
  }

  // 1) Consent Mode v2 defaults — pushed BEFORE the GTM loader.
  w.dataLayer.push({
    0: "consent",
    1: "default",
    2: {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      functionality_storage: "granted",
      security_storage: "granted",
      wait_for_update: 500,
    },
  } as unknown as Record<string, unknown>);

  // 2) GTM container loader.
  w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  if (!document.getElementById("gtm-loader")) {
    const s = document.createElement("script");
    s.id = "gtm-loader";
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(s);
  }

  // 3) <noscript> fallback iframe — only when ID exists.
  if (!document.getElementById("gtm-noscript")) {
    const ns = document.createElement("noscript");
    ns.id = "gtm-noscript";
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(id)}`;
    iframe.height = "0";
    iframe.width = "0";
    iframe.style.display = "none";
    iframe.style.visibility = "hidden";
    ns.appendChild(iframe);
    document.body?.insertBefore(ns, document.body.firstChild);
  }
}

/** Push a virtual page_view to the dataLayer (no-op if GTM disabled). */
export function pushPageView(path: string): void {
  if (typeof window === "undefined") return;
  const w = window as DataLayerWindow;
  if (!w.dataLayer) return;
  w.dataLayer.push({
    event: "page_view",
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

/* ------------------------------------------------------------------ */
/* Consent Mode v2 update API                                          */
/* ------------------------------------------------------------------ */

export type ConsentDecision = "accept_all" | "reject_non_essential";

export interface ConsentState {
  ad_storage: "granted" | "denied";
  ad_user_data: "granted" | "denied";
  ad_personalization: "granted" | "denied";
  analytics_storage: "granted" | "denied";
  functionality_storage: "granted" | "denied";
  security_storage: "granted" | "denied";
}

export const CONSENT_STORAGE_KEY = "qitaat_consent_v1";

export const CONSENT_ACCEPT_ALL: ConsentState = {
  ad_storage: "granted",
  ad_user_data: "granted",
  ad_personalization: "granted",
  analytics_storage: "granted",
  functionality_storage: "granted",
  security_storage: "granted",
};

export const CONSENT_REJECT_NON_ESSENTIAL: ConsentState = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
  functionality_storage: "granted",
  security_storage: "granted",
};

interface StoredConsent {
  decision: ConsentDecision;
  state: ConsentState;
  ts: number;
}

export function readStoredConsent(): StoredConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (!parsed?.state || !parsed?.decision) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Push a Consent Mode v2 update to the dataLayer and persist the choice.
 * No-op (other than persistence) if GTM/dataLayer was never initialized.
 * NEVER includes PII — only the six consent signals + a decision label.
 */
export function updateConsent(decision: ConsentDecision): ConsentState {
  const state =
    decision === "accept_all" ? CONSENT_ACCEPT_ALL : CONSENT_REJECT_NON_ESSENTIAL;

  try {
    const payload: StoredConsent = { decision, state, ts: Date.now() };
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* storage unavailable — still push to dataLayer */
  }

  if (typeof window === "undefined") return state;
  const w = window as DataLayerWindow;
  w.dataLayer = w.dataLayer ?? [];
  // Consent Mode v2 update — pushed in the gtag() arguments shape so GTM
  // recognizes it identically to `gtag('consent', 'update', {...})`.
  w.dataLayer.push({ 0: "consent", 1: "update", 2: state } as unknown as Record<string, unknown>);
  // Also emit a lightweight event for custom triggers in GTM (no PII).
  w.dataLayer.push({ event: "consent_update", consent_decision: decision });
  return state;
}