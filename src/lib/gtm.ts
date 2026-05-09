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