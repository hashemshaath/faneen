// Shared helper for hashing OTP codes before persistence.
// We never store the raw 6-digit code in the database. On verify we
// re-hash the incoming code with the same inputs and compare digests
// using timing-safe equality.
//
// Hash inputs: `${code}|${userId}|${pepper}`
//  - userId provides per-row uniqueness so two users with the same
//    OTP do not produce the same digest.
//  - pepper (env: OTP_HASH_PEPPER) raises the cost of an offline brute
//    force across the 10^6 code space if the audit/backup is leaked.
//    When unset we still hash (per-user salting) but log a warning.

let pepperWarned = false;

function getPepper(): string {
  const p = Deno.env.get("OTP_HASH_PEPPER") || "";
  if (!p && !pepperWarned) {
    pepperWarned = true;
    console.warn(
      "[otpHash] OTP_HASH_PEPPER is not configured; OTP hashes are still per-user salted but missing an additional pepper.",
    );
  }
  return p;
}

export async function hashOtp(code: string, userId: string): Promise<string> {
  const input = `${code}|${userId}|${getPepper()}`;
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