/**
 * Branch telemetry — records per-branch interaction events into the
 * public.branch_visits table for owner-facing analytics dashboards.
 *
 * Privacy contract:
 *   - No PII is sent. Only a per-device hash (`visitor_hash`) tied to a
 *     stable random session id stored in localStorage.
 *   - All inserts are best-effort and never throw to the caller.
 *   - event_type is a strict allowlist (DB CHECK constraint + RLS policy).
 */

import { supabase } from "@/integrations/supabase/client";

export type BranchEventType =
  | "view"
  | "phone_reveal"
  | "whatsapp_click"
  | "share"
  | "favorite";

const SESSION_KEY = "qitaat_visitor_sid_v1";

function getVisitorSid(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let sid = window.localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) + Date.now().toString(36);
      window.localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "anon";
  }
}

async function hash(input: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const enc = new TextEncoder().encode(input);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 64);
  }
  // Fallback: simple FNV-like — never reaches modern browsers
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h = (h ^ input.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return ("00000000" + h.toString(16)).repeat(2).slice(0, 32);
}

const recent = new Map<string, number>();
const DEDUPE_MS = 30_000;

export async function recordBranchVisit(params: {
  businessId: string | null | undefined;
  branchId: string | null | undefined;
  eventType: BranchEventType;
}): Promise<void> {
  const { businessId, branchId, eventType } = params;
  if (!businessId || !branchId) return;
  const key = `${branchId}:${eventType}`;
  const now = Date.now();
  const last = recent.get(key);
  if (last && now - last < DEDUPE_MS) return;
  recent.set(key, now);

  try {
    const sid = getVisitorSid();
    const visitor_hash = await hash(`${sid}:${branchId}:${eventType}`);
    await supabase.from("branch_visits").insert({
      business_id: businessId,
      branch_id: branchId,
      event_type: eventType,
      visitor_hash,
    });
  } catch {
    // best-effort — analytics writes must never break UX
  }
}