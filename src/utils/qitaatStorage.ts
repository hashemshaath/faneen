/**
 * Unified storage accessor for the qitaat namespace.
 * Always reads/writes `qitaat_*` keys, with a smart one-time fallback to
 * legacy `faneen_*` keys ONLY when the new key is absent.
 *
 * Use this helper instead of calling localStorage directly for any key
 * that has (or had) a faneen_* counterpart, to ensure seamless reads
 * during the migration window.
 */
const NEW_PREFIX = 'qitaat_';
const LEGACY_PREFIX = 'faneen_';

function legacyKey(qitaatKey: string): string | null {
  if (!qitaatKey.startsWith(NEW_PREFIX)) return null;
  return LEGACY_PREFIX + qitaatKey.slice(NEW_PREFIX.length);
}

/**
 * Read a value: prefers the new `qitaat_` key, falls back to legacy `faneen_`
 * if the new key is missing. Returns `null` if neither exists.
 */
export function readQitaatItem(qitaatKey: string): string | null {
  try {
    const fresh = localStorage.getItem(qitaatKey);
    if (fresh !== null) return fresh;
    const legacy = legacyKey(qitaatKey);
    return legacy ? localStorage.getItem(legacy) : null;
  } catch {
    return null;
  }
}

/**
 * Write a value to the new `qitaat_` key only. Removes the legacy
 * counterpart (if any) to prevent stale reads on next visit.
 */
export function writeQitaatItem(qitaatKey: string, value: string): void {
  try {
    localStorage.setItem(qitaatKey, value);
    const legacy = legacyKey(qitaatKey);
    if (legacy) localStorage.removeItem(legacy);
  } catch {
    // Silent — storage may be unavailable (private mode, quota, etc.)
  }
}

/**
 * Remove both the new and legacy keys to fully clear a value.
 */
export function removeQitaatItem(qitaatKey: string): void {
  try {
    localStorage.removeItem(qitaatKey);
    const legacy = legacyKey(qitaatKey);
    if (legacy) localStorage.removeItem(legacy);
  } catch {
    // Silent
  }
}

/**
 * JSON-safe read with parse + fallback default.
 */
export function readQitaatJSON<T>(qitaatKey: string, fallback: T): T {
  const raw = readQitaatItem(qitaatKey);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeQitaatJSON(qitaatKey: string, value: unknown): void {
  try {
    writeQitaatItem(qitaatKey, JSON.stringify(value));
  } catch {
    // Silent
  }
}
