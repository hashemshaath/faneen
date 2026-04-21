import { createRoot } from "react-dom/client";
import { validateEnv } from "./utils/validateEnv";
import App from "./App.tsx";
import "./index.css";

validateEnv();

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

createRoot(document.getElementById("root")!).render(<App />);
