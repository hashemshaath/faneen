/**
 * PRA-2 sanitization helpers for password-reset analytics.
 *
 * Pure, side-effect-free utilities used at every `createPasswordResetLog`
 * call-site to guarantee that no recovery token, query/hash fragment, cookie,
 * Authorization header, or oversized payload ever lands in
 * `password_reset_log.metadata`.
 */

/** Keys whose values must never be stored, regardless of how they arrive. */
const FORBIDDEN_KEYS = new Set<string>([
  'token', 'access_token', 'refresh_token', 'id_token', 'code', 'otp',
  'state', 'authorization', 'cookie', 'password', 'new_password',
  'session', 'jwt', 'secret',
]);

/** Hard cap so a single analytics row can never blow up the table. */
export const METADATA_MAX_BYTES = 4096;

/**
 * Strip query string and hash fragment from a path, leaving only the route
 * portion that is safe to persist. Returns `'/'` on any parse failure.
 */
export function sanitizeAnalyticsPath(input: string | null | undefined): string {
  if (!input) return '/';
  // input may be a pathname, a full URL, or `pathname?x=y#z` — handle all.
  const cleaned = input.split('?')[0].split('#')[0];
  if (cleaned.startsWith('/')) return cleaned || '/';
  try {
    const u = new URL(cleaned);
    return u.pathname || '/';
  } catch {
    return '/';
  }
}

/**
 * For `document.referrer`: keep only `origin + pathname`. Drop query/hash so
 * a referrer like `https://x.test/reset#access_token=…` never leaks the
 * token into analytics.
 */
export function sanitizeAnalyticsReferrer(input: string | null | undefined): string | null {
  if (!input) return null;
  try {
    const u = new URL(input);
    return `${u.origin}${u.pathname}`;
  } catch {
    return null;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Recursively scrub forbidden keys from a metadata payload, drop string
 * values that look like JWTs / long opaque tokens, and enforce the byte cap.
 * Never throws.
 */
export function sanitizePasswordResetMetadata(
  input: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!isPlainObject(input)) return {};
  const out: Record<string, unknown> = {};
  for (const [rawKey, value] of Object.entries(input)) {
    const key = rawKey.toLowerCase();
    if (FORBIDDEN_KEYS.has(key)) continue;
    if (typeof value === 'string') {
      // JWT-shaped or very long opaque strings are dropped defensively.
      if (/^ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/.test(value)) continue;
      if (value.length > 512) {
        out[rawKey] = value.slice(0, 512);
        continue;
      }
      out[rawKey] = value;
    } else if (isPlainObject(value)) {
      out[rawKey] = sanitizePasswordResetMetadata(value);
    } else if (Array.isArray(value)) {
      out[rawKey] = value.slice(0, 32);
    } else {
      out[rawKey] = value;
    }
  }
  // Enforce hard byte cap. If exceeded, replace with a marker so we still
  // know the event fired without persisting an oversized blob.
  try {
    const serialized = JSON.stringify(out);
    if (serialized.length > METADATA_MAX_BYTES) {
      return { _truncated: true, _original_bytes: serialized.length };
    }
  } catch {
    return { _truncated: true };
  }
  return out;
}