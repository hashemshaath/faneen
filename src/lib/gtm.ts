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
  gtag?: (...args: unknown[]) => void;
};

const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/;

/* ------------------------------------------------------------------ */
/* Production-host gating                                              */
/* GA4/GTM must only run on qitaat.com (and www). Lovable preview      */
/* hosts (lovable.app, lovableproject.com, id-preview--*) MUST NOT     */
/* fire hits — otherwise GA4 surfaces them as cross-domain candidates  */
/* and pollutes Container Quality. Override with either:               */
/*   - build env: VITE_ENABLE_ANALYTICS_IN_PREVIEW=true                */
/*   - runtime:   localStorage['qitaat_enable_analytics_preview']='1'  */
/* ------------------------------------------------------------------ */
const PROD_HOSTS = new Set(["qitaat.com", "www.qitaat.com"]);
const PREVIEW_OVERRIDE_KEY = "qitaat_enable_analytics_preview";

export function isAnalyticsHostAllowed(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  if (PROD_HOSTS.has(host)) return true;
  const buildOverride = String(import.meta.env.VITE_ENABLE_ANALYTICS_IN_PREVIEW ?? "")
    .toLowerCase() === "true";
  if (buildOverride) return true;
  try {
    if (localStorage.getItem(PREVIEW_OVERRIDE_KEY) === "1") return true;
  } catch { /* storage unavailable */ }
  return false;
}

/* ------------------------------------------------------------------ */
/* Consent audit log — every gtag('consent', ...) call we make is      */
/* recorded here with a correlationId + reason so Container Quality    */
/* issues can be diagnosed end-to-end without server logs.             */
/* ------------------------------------------------------------------ */

export type ConsentAuditKind = "default" | "update" | "replay" | "custom";

export interface ConsentAuditEntry {
  id: string;
  ts: number;
  correlationId: string;
  kind: ConsentAuditKind;
  reason: string;
  state?: Record<string, unknown>;
  decision?: string;
}

const AUDIT_MAX = 50;
const auditBuffer: ConsentAuditEntry[] = [];
const auditListeners = new Set<() => void>();
let lastConsentUpdate: ConsentAuditEntry | null = null;

function newCorrelationId(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function recordConsent(
  kind: ConsentAuditKind,
  reason: string,
  state?: Record<string, unknown>,
  decision?: string,
  correlationId: string = newCorrelationId(),
): ConsentAuditEntry {
  const entry: ConsentAuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    correlationId,
    kind,
    reason,
    state,
    decision,
  };
  auditBuffer.push(entry);
  if (auditBuffer.length > AUDIT_MAX) auditBuffer.splice(0, auditBuffer.length - AUDIT_MAX);
  if (kind !== "default") lastConsentUpdate = entry;
  auditListeners.forEach((l) => { try { l(); } catch { /* ignore */ } });
  return entry;
}

export function getConsentAuditLog(): ConsentAuditEntry[] {
  return auditBuffer.slice();
}

export function getLastConsentUpdate(): ConsentAuditEntry | null {
  return lastConsentUpdate;
}

export function subscribeConsentAudit(l: () => void): () => void {
  auditListeners.add(l);
  return () => auditListeners.delete(l);
}

/** Test-only: reset module state. Safe in production (just clears buffers). */
export function __resetGtmForTests(): void {
  initialized = false;
  auditBuffer.length = 0;
  lastConsentUpdate = null;
}

/**
 * Push a `gtag()`-style command onto the dataLayer.
 *
 * GTM's Consent Mode only recognizes consent commands that arrive as a real
 * `Arguments` object. We therefore:
 *   1. Prefer the global `window.gtag` defined inline in `index.html`
 *      (the canonical `function gtag(){dataLayer.push(arguments);}` shim).
 *   2. Fall back to a local function that does the same. We avoid rest
 *      parameters here because TS/Vite transpilation of `..._args` can
 *      interfere with the `arguments` object semantics in some targets.
 */
function localGtag(this: void): void {
  const w = window as DataLayerWindow;
  w.dataLayer = w.dataLayer ?? [];
  // eslint-disable-next-line prefer-rest-params
  w.dataLayer.push(arguments as unknown as IArguments);
}
function gtag(...args: unknown[]): void {
  if (typeof window === "undefined") return;
  const w = window as DataLayerWindow;
  if (typeof w.gtag === "function") {
    // Apply through the canonical shim from index.html so `arguments`
    // is constructed inside that function with the correct [[Class]].
    w.gtag.apply(null, args);
    return;
  }
  // eslint-disable-next-line prefer-spread
  localGtag.apply(null, args as []);
}

export function getGtmId(): string | null {
  const raw = (import.meta.env.VITE_GTM_ID ?? "").toString().trim();
  if (!raw) return null;
  if (!GTM_ID_PATTERN.test(raw)) {
    // Invalid format — refuse to load.
     
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

  // Host gate: skip everything (including the safety-net replay) on non-
  // production hosts. The dataLayer + Consent Mode defaults pushed inline
  // in index.html are harmless without GTM, so consent state is preserved
  // for when the visitor returns to the production domain.
  if (!isAnalyticsHostAllowed()) return;

  initialized = true;
  const w = window as DataLayerWindow;
  w.dataLayer = w.dataLayer ?? [];

  // Safety-net consent replay: index.html already replays stored consent
  // inline (before GTM loads). This runtime path covers builds where the
  // inline snippet is absent (e.g. Lovable preview iframe, future template
  // changes) so a returning visitor's "granted" state always reaches GTM.
  // Idempotent — pushing the same state twice is a no-op for GTM.
  try {
    const stored = readStoredConsent();
    if (stored?.state) {
      const cid = newCorrelationId();
      gtag("consent", "update", stored.state);
      recordConsent(
        "replay",
        "returning-visitor:initGtm",
        stored.state as unknown as Record<string, unknown>,
        stored.decision,
        cid,
      );
      // Mirror to dataLayer as a debug breadcrumb (no PII).
      w.dataLayer.push({
        event: "consent_update",
        consent_decision: stored.decision,
        consent_replay: true,
        consent_correlation_id: cid,
      });
    }
  } catch {
    /* storage unavailable */
  }

  // If GTM is already present in HTML (static load via index.html), skip
  // re-injection — but the consent replay above has already run.
  if (document.querySelector('script[src*="googletagmanager.com/gtm.js"]')) {
    return;
  }

  // 1) Consent Mode v2 defaults — pushed BEFORE the GTM loader, as an
  //    Arguments object via gtag() so GTM recognizes the consent command.
  //    (Only reached when HTML did NOT inline-load GTM.)
  const defaultState = {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 500,
  };
  gtag("consent", "default", defaultState);
  recordConsent("default", "initGtm:no-html-inline", defaultState);

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
  const cid = newCorrelationId();
  // Consent Mode v2 update — MUST be pushed as a real Arguments object.
  gtag("consent", "update", state);
  recordConsent("update", `user-decision:${decision}`, state as unknown as Record<string, unknown>, decision, cid);
  // Lightweight event for custom triggers in GTM (no PII).
  w.dataLayer.push({
    event: "consent_update",
    consent_decision: decision,
    consent_correlation_id: cid,
  });
  return state;
}

/**
 * Push a custom Consent Mode v2 update (mixed toggles) to the dataLayer.
 * Used by the banner's "manage preferences → save" path. No PII.
 */
export function pushConsentUpdate(
  state: ConsentState,
  decisionLabel: string,
): void {
  if (typeof window === "undefined") return;
  const w = window as DataLayerWindow;
  w.dataLayer = w.dataLayer ?? [];
  const cid = newCorrelationId();
  gtag("consent", "update", state);
  recordConsent("custom", `manage-prefs:${decisionLabel}`, state as unknown as Record<string, unknown>, decisionLabel, cid);
  w.dataLayer.push({
    event: "consent_update",
    consent_decision: decisionLabel,
    consent_correlation_id: cid,
  });
}