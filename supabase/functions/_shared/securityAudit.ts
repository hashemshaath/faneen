// Shared helpers for writing PII-safe entries to public.security_audit_log
// from edge functions. Identifiers are SHA-256 hashed with a project salt
// so raw phone numbers, emails, and IPs never reach the audit table.
//
// Usage:
//   import { logSecurityEvent, hashSubject, hashIp, extractIp } from "../_shared/securityAudit.ts";
//   await logSecurityEvent(admin, {
//     event_type: "otp_send",
//     event_action: "success",
//     user_id,
//     subject_hash: await hashSubject(fullPhone),
//     ip_hash: await hashIp(req),
//     user_agent: req.headers.get("user-agent") || null,
//     reason: "sms_sent",
//   });
//
// All functions are best-effort: failures are swallowed and logged to
// console so audit logging never breaks the primary request flow.

// Minimal subset of the supabase-js client we rely on. Avoids importing the
// real type and pulling type baggage across runtimes.
interface AuditClient {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>;
}

export interface SecurityAuditEntry {
  event_type: string;          // 'otp_send' | 'otp_verify' | 'login_otp_send' | 'login_otp_verify' | 'password_reset' | 'supplier_lead_notify'
  event_action: string;        // 'attempt' | 'success' | 'failed' | 'rate_limited'
  status?: "info" | "warn" | "error";
  user_id?: string | null;
  subject_hash?: string | null;
  ip_hash?: string | null;
  user_agent?: string | null;
  request_id?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}

let saltMissingWarned = false;

/**
 * Returns the configured salt for PII hashing, or null if no real secret
 * is configured. We deliberately do NOT fall back to publicly knowable
 * values (e.g. SUPABASE_URL) or hardcoded literals, because either would
 * make the hashes reversible via a small rainbow table over the Saudi
 * phone-number space.
 */
function getSalt(): string | null {
  const salt =
    Deno.env.get("SECURITY_AUDIT_SALT") ||
    Deno.env.get("RATE_LIMIT_SALT") ||
    "";
  if (!salt) {
    if (!saltMissingWarned) {
      saltMissingWarned = true;
      console.warn(
        "[securityAudit] SECURITY_AUDIT_SALT is not configured; subject/IP hashes will be omitted from audit log entries.",
      );
    }
    return null;
  }
  return salt;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Hash any subject (phone, email, target user id) with the project salt. */
export async function hashSubject(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  const salt = getSalt();
  if (!salt) return null;
  return sha256Hex(`${String(value).trim().toLowerCase()}|${salt}`);
}

/** Extract the best-effort client IP from a Deno Request. */
export function extractIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  const first = xff.split(",")[0]?.trim();
  if (first) return first;
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Hash the request's client IP with the project salt. */
export async function hashIp(req: Request): Promise<string | null> {
  const ip = extractIp(req);
  if (!ip || ip === "unknown") return null;
  const salt = getSalt();
  if (!salt) return null;
  return sha256Hex(`${ip}|${salt}`);
}

/** Best-effort write to public.security_audit_log. Never throws. */
export async function logSecurityEvent(
  admin: AuditClient,
  entry: SecurityAuditEntry,
): Promise<void> {
  try {
    await admin.rpc("log_security_event", {
      _event_type: entry.event_type,
      _event_action: entry.event_action,
      _status: entry.status ?? "info",
      _user_id: entry.user_id ?? null,
      _subject_hash: entry.subject_hash ?? null,
      _ip_hash: entry.ip_hash ?? null,
      _user_agent: entry.user_agent ?? null,
      _request_id: entry.request_id ?? null,
      _reason: entry.reason ?? null,
      _metadata: entry.metadata ?? {},
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : "unknown";
    console.warn(`[securityAudit] log failed (${entry.event_type}/${entry.event_action}):`, m);
  }
}