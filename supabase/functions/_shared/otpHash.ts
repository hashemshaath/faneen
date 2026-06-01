// Shared helper for hashing OTP codes before persistence.
// We never store the raw 6-digit code in the database. On verify we
// re-hash the incoming code with the same inputs and compare digests
// using timing-safe equality.
//
// Hash inputs: `${code}|${userId}|${pepper}`
//  - userId provides per-row uniqueness so two users with the same
//    OTP do not produce the same digest.
//  - pepper (env: OTP_HASH_PEPPER) is REQUIRED. If missing, both the
//    send and verify paths fail closed with a generic error — we do
//    not silently fall back to a per-user-only hash, because that
//    would let an attacker who reads a backup brute force the 10^6
//    code space.

/** Sentinel thrown when OTP_HASH_PEPPER is not configured. Callers must
 *  catch this and return a generic 500 to the user. The error message
 *  intentionally does not name the missing secret. */
export class OtpHashConfigError extends Error {
  constructor() {
    super("otp_hash_unavailable");
    this.name = "OtpHashConfigError";
  }
}

function getPepperOrThrow(): string {
  const p = Deno.env.get("OTP_HASH_PEPPER") || "";
  if (!p) {
    // Log a non-sensitive diagnostic (never the value) so operators see
    // the misconfiguration in edge function logs.
    console.error("[otpHash] required pepper secret is not configured; refusing to hash OTP");
    throw new OtpHashConfigError();
  }
  return p;
}

export async function hashOtp(code: string, userId: string): Promise<string> {
  const input = `${code}|${userId}|${getPepperOrThrow()}`;
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Timing-safe equality on equal-length hex digests. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}