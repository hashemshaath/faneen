import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

/**
 * Lightweight RUM collector. Buffers Core Web Vitals samples and ships them
 * to the `ingest-web-vitals` edge function in a single batched POST when the
 * page is hidden / unloaded (using sendBeacon when available so navigation
 * is never blocked).
 */
const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-web-vitals`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface VitalPayload {
  metric_name: string;
  metric_value: number;
  metric_rating: string;
  page_path: string;
  user_agent: string;
  connection_type?: string;
  device_type: string;
}

const buffer: VitalPayload[] = [];
let flushScheduled = false;

function deviceType(): string {
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  return "desktop";
}

function connectionType(): string | undefined {
  const c = (navigator as unknown as { connection?: { effectiveType?: string } })
    .connection;
  return c?.effectiveType;
}

function flush() {
  if (buffer.length === 0) return;
  const events = buffer.splice(0, buffer.length);
  const body = JSON.stringify({ events });
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      // sendBeacon ignores custom headers, but the ingest function is public
      // (verify_jwt = false) so the anon key is not strictly required.
      navigator.sendBeacon(ENDPOINT, blob);
      return;
    }
  } catch {
    /* fall through to fetch */
  }
  void fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body,
    keepalive: true,
  }).catch(() => {
    /* swallow — RUM must never break the app */
  });
}

function scheduleFlush() {
  if (flushScheduled) return;
  flushScheduled = true;
  // Debounce in case multiple metrics fire in the same task
  setTimeout(() => {
    flushScheduled = false;
    flush();
  }, 1500);
}

function record(metric: Metric) {
  buffer.push({
    metric_name: metric.name,
    metric_value: Number(metric.value.toFixed(2)),
    metric_rating: metric.rating,
    page_path: window.location.pathname,
    user_agent: navigator.userAgent.slice(0, 500),
    connection_type: connectionType(),
    device_type: deviceType(),
  });
  scheduleFlush();
}

let started = false;

export function startWebVitals() {
  if (started) return;
  started = true;
  try {
    onLCP(record);
    onCLS(record);
    onINP(record);
    onFCP(record);
    onTTFB(record);
    // Final flush on tab close / hide
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
    window.addEventListener("pagehide", flush);
  } catch {
    /* never break app for telemetry */
  }
}