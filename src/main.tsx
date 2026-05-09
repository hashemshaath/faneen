import { createRoot } from "react-dom/client";
import { validateEnv } from "./utils/validateEnv";
import App from "./App.tsx";
import "./index.css";
import { startWebVitals } from "./utils/reportWebVitals";
import { installDiagnostics } from "./lib/diagnostics";
import { initGtm } from "./lib/gtm";

validateEnv();

// Install in-browser diagnostics buffer (console errors, network failures,
// unhandled rejections). Exposed at /diagnostics for developers.
installDiagnostics();

// Bootstrap Google Tag Manager + Consent Mode v2 (no-op without VITE_GTM_ID).
initGtm();

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
