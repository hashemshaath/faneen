/**
 * Consent Mode v2 watchdog & self-healer.
 *
 * Background
 * ----------
 * Google's GTM Container Quality flags accounts when ≥X% of visitors land
 * with Consent Mode "denied". This can happen even when the consent code is
 * correct, because of:
 *   • returning visitors whose stored decision was never replayed to GTM,
 *   • a race where the GTM container loads before the inline replay runs,
 *   • a third-party script that pushes a stale `consent default` AFTER our
 *     update,
 *   • localStorage being cleared by a CMP plugin or a browser extension.
 *
 * What this module does
 * ---------------------
 *   1. On startup, sample the current Consent Mode state (best-effort, by
 *      asking the canonical `gtag` shim and inspecting the dataLayer for the
 *      most recent consent command).
 *   2. If a stored decision exists in `qitaat_consent_v1` but the current
 *      state still looks "denied" after a grace period, force a re-push of
 *      `gtag('consent','update', stored.state)`. This is the self-heal.
 *   3. Track a rolling window of recent samples in localStorage
 *      (`qitaat_consent_health_v1`). If the window shows 100% denied for
 *      ≥N consecutive samples WHILE the user has accepted, flag the session
 *      as "stuck" and schedule one final re-sync attempt.
 *   4. Expose a `getConsentHealth()` snapshot for the admin diagnostics page.
 *
 * Privacy
 * -------
 * Stores ONLY the six consent flags + counters + timestamps. No PII, no URLs,
 * no user identifiers.
 */

import {
  CONSENT_STORAGE_KEY,
  pushConsentUpdate,
  readStoredConsent,
  type ConsentState,
} from "@/lib/gtm";

const HEALTH_KEY = "qitaat_consent_health_v1";
const MAX_SAMPLES = 10;
const STUCK_THRESHOLD = 3; // consecutive all-denied samples ⇒ self-heal
const SAMPLE_DELAYS_MS = [800, 2500, 6000]; // post-load checkpoints

type Verdict = "ok" | "missing" | "denied-mismatch" | "no-decision" | "no-datalayer";

export interface ConsentHealthSnapshot {
  lastVerdict: Verdict;
  lastSampleAt: number;
  lastResyncAt: number | null;
  resyncCount: number;
  mismatchCount: number;
  samples: Array<{ ts: number; verdict: Verdict; allDenied: boolean }>;
}

type DataLayerWindow = Window & {
  dataLayer?: Array<Record<string, unknown> | IArguments>;
};

const EMPTY: ConsentHealthSnapshot = {
  lastVerdict: "no-decision",
  lastSampleAt: 0,
  lastResyncAt: null,
  resyncCount: 0,
  mismatchCount: 0,
  samples: [],
};

function readHealth(): ConsentHealthSnapshot {
  try {
    const raw = localStorage.getItem(HEALTH_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as ConsentHealthSnapshot;
    return {
      ...EMPTY,
      ...parsed,
      samples: Array.isArray(parsed.samples) ? parsed.samples.slice(-MAX_SAMPLES) : [],
    };
  } catch {
    return { ...EMPTY };
  }
}

function writeHealth(h: ConsentHealthSnapshot): void {
  try {
    localStorage.setItem(HEALTH_KEY, JSON.stringify(h));
  } catch {
    /* storage unavailable */
  }
}

/**
 * Best-effort inspection of the current consent state visible in dataLayer.
 * Returns the most recently pushed consent state from the canonical shape:
 *   ['consent', 'update' | 'default', { …signals }]
 * Falls back to null if no consent command was found.
 */
function inspectDataLayer(): ConsentState | null {
  if (typeof window === "undefined") return null;
  const w = window as DataLayerWindow;
  const dl = Array.isArray(w.dataLayer) ? w.dataLayer : [];
  for (let i = dl.length - 1; i >= 0; i--) {
    const entry = dl[i];
    if (!entry) continue;
    // entry is either a plain object {event:...} or an Arguments-like object
    // where 0='consent', 1='update'|'default', 2={state}.
    const a = entry as Record<string, unknown>;
    if (a[0] === "consent" && (a[1] === "update" || a[1] === "default") && a[2]) {
      return a[2] as ConsentState;
    }
  }
  return null;
}

function isAllDenied(state: ConsentState | null): boolean {
  if (!state) return true;
  return (
    state.ad_storage === "denied" &&
    state.ad_user_data === "denied" &&
    state.ad_personalization === "denied" &&
    state.analytics_storage === "denied"
  );
}

function statesEqual(a: ConsentState | null, b: ConsentState | null): boolean {
  if (!a || !b) return false;
  return (
    a.ad_storage === b.ad_storage &&
    a.ad_user_data === b.ad_user_data &&
    a.ad_personalization === b.ad_personalization &&
    a.analytics_storage === b.analytics_storage &&
    a.functionality_storage === b.functionality_storage &&
    a.security_storage === b.security_storage
  );
}

function sample(): { verdict: Verdict; current: ConsentState | null; stored: ReturnType<typeof readStoredConsent> } {
  const stored = readStoredConsent();
  const current = inspectDataLayer();

  if (!current && (typeof window === "undefined" || !(window as DataLayerWindow).dataLayer)) {
    return { verdict: "no-datalayer", current, stored };
  }
  if (!stored) {
    // No saved decision yet — denied baseline is expected behavior, not a bug.
    return { verdict: "no-decision", current, stored };
  }
  if (!current) {
    return { verdict: "missing", current, stored };
  }
  if (!statesEqual(current, stored.state)) {
    return { verdict: "denied-mismatch", current, stored };
  }
  return { verdict: "ok", current, stored };
}

function recordSample(verdict: Verdict, allDenied: boolean): ConsentHealthSnapshot {
  const h = readHealth();
  const next: ConsentHealthSnapshot = {
    ...h,
    lastVerdict: verdict,
    lastSampleAt: Date.now(),
    samples: [...h.samples, { ts: Date.now(), verdict, allDenied }].slice(-MAX_SAMPLES),
  };
  if (verdict === "denied-mismatch" || verdict === "missing") next.mismatchCount = h.mismatchCount + 1;
  writeHealth(next);
  return next;
}

function resync(state: ConsentState, decisionLabel: string, reason: string): void {
  pushConsentUpdate(state, decisionLabel);
  const w = window as DataLayerWindow;
  w.dataLayer = w.dataLayer ?? [];
  // Diagnostic event — visible in GTM Preview / admin diagnostics page.
  w.dataLayer.push({
    event: "consent_resync",
    consent_decision: decisionLabel,
    consent_resync_reason: reason,
  });
  const h = readHealth();
  writeHealth({
    ...h,
    lastResyncAt: Date.now(),
    resyncCount: h.resyncCount + 1,
  });
   
  console.info(`[consent-watchdog] resynced (${reason})`);
}

let started = false;

/**
 * Boot the watchdog. Safe to call multiple times — only the first call
 * schedules samples. Designed to run AFTER `initGtm()` in main.tsx.
 */
export function startConsentWatchdog(): void {
  if (started) return;
  if (typeof window === "undefined") return;
  started = true;

  const run = (label: string) => {
    const { verdict, current, stored } = sample();
    const allDenied = isAllDenied(current);
    const h = recordSample(verdict, allDenied);

    // Self-heal cases:
    //   1. We have a stored decision but the current state diverges → resync.
    //   2. We have a stored decision and STUCK_THRESHOLD recent samples are
    //      all-denied while the stored state isn't all-denied → resync.
    if (stored?.state) {
      const storedAllDenied = isAllDenied(stored.state);
      if (verdict === "denied-mismatch" || verdict === "missing") {
        resync(stored.state, stored.decision, `${label}:${verdict}`);
        return;
      }
      if (!storedAllDenied) {
        const lastN = h.samples.slice(-STUCK_THRESHOLD);
        if (lastN.length >= STUCK_THRESHOLD && lastN.every((s) => s.allDenied)) {
          resync(stored.state, stored.decision, `${label}:stuck`);
        }
      }
    }
  };

  // Schedule three deferred samples; covers race with async gtm.js loader.
  for (const delay of SAMPLE_DELAYS_MS) {
    window.setTimeout(() => run(`t+${delay}ms`), delay);
  }

  // Cross-tab sync: when consent is updated in another tab, replay locally.
  window.addEventListener("storage", (ev) => {
    if (ev.key !== CONSENT_STORAGE_KEY) return;
    const stored = readStoredConsent();
    if (stored?.state) resync(stored.state, stored.decision, "cross-tab");
  });

  // After the page becomes visible again (e.g. user returns from another tab),
  // verify once. GTM may have lazy-loaded during the hidden period.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") run("visibility");
  });
}

export function getConsentHealth(): ConsentHealthSnapshot {
  return readHealth();
}

/** Force a verification + resync now (called by the admin diagnostics page). */
export function runConsentCheckNow(): ConsentHealthSnapshot {
  const { verdict, stored } = sample();
  const h = recordSample(verdict, isAllDenied(inspectDataLayer()));
  if (stored?.state && (verdict === "denied-mismatch" || verdict === "missing")) {
    resync(stored.state, stored.decision, "manual");
  }
  return readHealth();
}