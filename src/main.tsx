import { createRoot } from "react-dom/client";
import { validateEnv } from "./utils/validateEnv";
import App from "./App.tsx";
import "./index.css";
import { startWebVitals } from "./utils/reportWebVitals";
import { installDiagnostics } from "./lib/diagnostics";
import { startConsentWatchdog } from "./lib/consent-watchdog";
import { captureAttribution } from "./lib/analytics-attribution";

validateEnv();

// Install in-browser diagnostics buffer (console errors, network failures,
// unhandled rejections). Exposed at /diagnostics for developers.
installDiagnostics();

// NOTE: Google Tag Manager is bootstrapped exclusively from the inline
// snippet in index.html (production-host gated, deferred until load+idle).
// We intentionally do NOT call initGtm() from JS to avoid duplicate gtm.js
// injection (the inline HTML loader and the runtime injector each used
// different element IDs, so neither saw the other and BOTH added the
// container script). Consent Mode v2 defaults + stored-consent replay are
// also handled inline in index.html before GTM loads.

// Self-healing consent watchdog: detects "stuck-denied" state and re-pushes
// the user's stored decision. Boots after initGtm() so the dataLayer exists.
startConsentWatchdog();

// Capture UTM + referrer attribution into localStorage (qitaat_attribution_v1).
// PII-safe: stores only utm_*, referrer hostname, landing pathname (no query).
// first_touch is written once; last_touch refreshes on fresh UTM hits.
try { captureAttribution(); } catch { /* never break boot */ }

// One-time legacy storage cleanup: removes any leftover `faneen_*` keys
// from beta-tester browsers. Safe no-op once it has run on a device.
(function cleanupLegacyFaneenStorage() {
  const FLAG = "qitaat_legacy_cleanup_v1_done";
  try {
    if (localStorage.getItem(FLAG) === "1") return;
    const wipe = (storage: Storage) => {
      const toRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (k && k.startsWith("faneen_")) toRemove.push(k);
      }
      toRemove.forEach((k) => storage.removeItem(k));
    };
    wipe(localStorage);
    try { wipe(sessionStorage); } catch { /* ignore */ }
    // Cookies named faneen_*
    try {
      document.cookie.split(";").forEach((c) => {
        const name = c.split("=")[0]?.trim();
        if (name && name.startsWith("faneen_")) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        }
      });
    } catch { /* ignore */ }
    localStorage.setItem(FLAG, "1");
  } catch {
    // Storage may be unavailable (private mode, quota) — silent
  }
})();

// Prevent SW from running inside Lovable preview iframe
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
} else if (import.meta.env.PROD && "serviceWorker" in navigator) {
  // Manual service-worker registration, deferred until after `load` + idle.
  // vite-plugin-pwa has `injectRegister: null`, so this is the ONLY place
  // /sw.js is registered. Keeping it out of the critical path means it
  // never competes with the LCP paint or blocks first interaction.
  const registerSW = () => {
    const idle: (cb: () => void) => void =
      typeof (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback === "function"
        ? (cb) => (window as Window & { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback(cb, { timeout: 4000 })
        : (cb) => window.setTimeout(cb, 2500);
    idle(() => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* SW registration is best-effort; never break the app */
      });
    });
  };
  if (document.readyState === "complete") registerSW();
  else window.addEventListener("load", registerSW, { once: true });
}

// RUM: collect Core Web Vitals from real visitors (skip Lovable preview to
// keep dev signal clean).
if (!isPreviewHost && !isInIframe) {
  startWebVitals();
}

createRoot(document.getElementById("root")!).render(<App />);

// Visual-regression / E2E readiness marker. Set after React commits its first
// paint, fonts settle, and any pending images have loaded. Playwright's
// `waitForSelector("html[data-app-ready]")` keys off this attribute to take
// stable screenshots without depending solely on networkidle.
(function markAppReady() {
  const flag = () => document.documentElement.setAttribute("data-app-ready", "1");
  const onIdle = (cb: () => void) => {
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const w = window as IdleWindow;
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(cb, { timeout: 1500 });
    } else {
      setTimeout(cb, 300);
    }
  };
  const ready = () => {
    const fontsReady = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready
      ?? Promise.resolve();
    Promise.all([fontsReady]).finally(() => onIdle(flag));
  };
  if (document.readyState === "complete") ready();
  else window.addEventListener("load", ready, { once: true });
})();
