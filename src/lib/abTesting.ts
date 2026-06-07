/**
 * Lightweight A/B testing client.
 * - Anonymous visitor_id stored in localStorage (no PII).
 * - Variants assigned deterministically server-side via ab_assign_variant RPC.
 * - Impressions logged inside the assignment RPC (one per visitor).
 * - Clicks tracked via ab_track_click (fire-and-forget).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const VISITOR_KEY = "qitaat_visitor_id";
const SESSION_PREFIX = "qitaat_ab_";

export interface AbVariant<T = Record<string, unknown>> {
  experiment_id: string;
  variant_id: string;
  variant_key: string;
  content: T;
  is_winner: boolean;
}

function uuidv4(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback (very old browsers)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "ssr-visitor";
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing && existing.length >= 8) return existing;
    const fresh = uuidv4();
    window.localStorage.setItem(VISITOR_KEY, fresh);
    return fresh;
  } catch {
    return "ephemeral-" + uuidv4();
  }
}

function readSessionCache<T>(key: string): AbVariant<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as AbVariant<T>;
  } catch {
    return null;
  }
}

function writeSessionCache<T>(key: string, value: AbVariant<T>): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_PREFIX + key, JSON.stringify(value));
  } catch {
    // ignore quota / privacy errors
  }
}

export function useAbVariant<T = Record<string, unknown>>(
  experimentKey: string,
): AbVariant<T> | null {
  const [variant, setVariant] = useState<AbVariant<T> | null>(() =>
    readSessionCache<T>(experimentKey),
  );

  useEffect(() => {
    let cancelled = false;
    if (variant) return; // already cached
    // Defer the assignment RPC until AFTER window load + idle so it never
    // competes with the LCP paint. The cached variant (if any) is already
    // returned synchronously above; this is purely for first-time visitors.
    const run = async () => {
      if (cancelled) return;
      const visitorId = getOrCreateVisitorId();
      try {
        const { data, error } = await supabase.rpc("ab_assign_variant", {
          p_experiment_key: experimentKey,
          p_visitor_id: visitorId,
        });
        if (cancelled) return;
        if (error || !data) return;
        const v = data as unknown as AbVariant<T>;
        if (!v?.variant_id) return;
        writeSessionCache(experimentKey, v);
        setVariant(v);
      } catch {
        /* network errors are non-fatal */
      }
    };
    type IdleWin = Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    };
    const w = window as IdleWin;
    const schedule = () => {
      if (typeof w.requestIdleCallback === "function") {
        w.requestIdleCallback(() => { void run(); }, { timeout: 4000 });
      } else {
        window.setTimeout(() => { void run(); }, 2500);
      }
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      cancelled = true;
    };
  }, [experimentKey, variant]);

  return variant;
}

export function trackAbClick(experimentKey: string): void {
  const visitorId = getOrCreateVisitorId();
  void supabase
    .rpc("ab_track_click", {
      p_experiment_key: experimentKey,
      p_visitor_id: visitorId,
    })
    .then(() => undefined);
}