import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  initGtm,
  updateConsent,
  CONSENT_STORAGE_KEY,
  CONSENT_ACCEPT_ALL,
  getConsentAuditLog,
  getLastConsentUpdate,
  __resetGtmForTests,
} from "@/lib/gtm";

type DLWin = Window & {
  dataLayer?: Array<Record<string, unknown> | IArguments>;
  gtag?: (...a: unknown[]) => void;
};

function resetWorld() {
  const w = window as DLWin;
  delete w.dataLayer;
  delete w.gtag;
  // Strip any GTM script we appended in a previous test.
  document.querySelectorAll('script[src*="googletagmanager.com/gtm.js"], #gtm-loader, #gtm-noscript')
    .forEach((n) => n.remove());
  localStorage.clear();
  __resetGtmForTests();
}

describe("initGtm — Consent Mode replay for returning visitors", () => {
  beforeEach(() => {
    resetWorld();
    vi.stubEnv("VITE_GTM_ID", "GTM-TEST1234");
    // Tests run on jsdom (hostname=localhost). Opt in so the production-host
    // gate doesn't short-circuit initGtm().
    localStorage.setItem("qitaat_enable_analytics_preview", "1");
  });

  it("replays stored consent BEFORE injecting gtm.js and records an audit entry", () => {
    // Simulate a returning visitor who already accepted.
    updateConsent("accept_all");
    // updateConsent recorded an 'update'; reset module so initGtm runs fresh.
    __resetGtmForTests();
    const w = window as DLWin;
    delete w.dataLayer;
    document.querySelectorAll("#gtm-loader").forEach((n) => n.remove());

    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeTruthy();

    initGtm();

    const dl = (window as DLWin).dataLayer ?? [];
    // Find the replay update breadcrumb and the gtm.js loader event.
    const replayIdx = dl.findIndex((e) => {
      const o = e as Record<string, unknown>;
      return o?.event === "consent_update" && o?.consent_replay === true;
    });
    const gtmJsIdx = dl.findIndex((e) => {
      const o = e as Record<string, unknown>;
      return o?.event === "gtm.js";
    });

    expect(replayIdx).toBeGreaterThanOrEqual(0);
    expect(gtmJsIdx).toBeGreaterThan(replayIdx);

    // Audit log captured the replay with a correlationId + reason.
    const audit = getConsentAuditLog();
    const replay = audit.find((a) => a.kind === "replay");
    expect(replay).toBeDefined();
    expect(replay?.reason).toBe("returning-visitor:initGtm");
    expect(replay?.correlationId).toMatch(/^c_/);
    expect(replay?.decision).toBe("accept_all");
    expect(replay?.state).toMatchObject(CONSENT_ACCEPT_ALL);

    // getLastConsentUpdate reflects the replay.
    expect(getLastConsentUpdate()?.kind).toBe("replay");

    // The gtm.js script tag was appended after the replay ran.
    expect(document.getElementById("gtm-loader")).not.toBeNull();
  });

  it("does NOT push a replay update for a brand-new visitor (no stored consent)", () => {
    initGtm();
    const audit = getConsentAuditLog();
    expect(audit.find((a) => a.kind === "replay")).toBeUndefined();
    // But the default IS recorded.
    expect(audit.find((a) => a.kind === "default")).toBeDefined();
  });

  it("skips re-injecting gtm.js if it was already inlined in HTML, but still replays", () => {
    // Simulate HTML having already injected GTM.
    const stub = document.createElement("script");
    stub.src = "https://www.googletagmanager.com/gtm.js?id=GTM-TEST1234";
    document.head.appendChild(stub);

    updateConsent("accept_all");
    __resetGtmForTests();
    delete (window as DLWin).dataLayer;

    initGtm();

    // No duplicate loader was appended.
    const loaders = document.querySelectorAll('script[src*="googletagmanager.com/gtm.js"]');
    expect(loaders.length).toBe(1);

    // But the replay still ran.
    const audit = getConsentAuditLog();
    expect(audit.find((a) => a.kind === "replay")).toBeDefined();
  });
});
