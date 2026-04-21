/**
 * Migrates legacy `faneen_*` localStorage keys to `qitaat_*` namespace.
 * Preserves user data, then removes old keys. Idempotent — safe to call on every boot.
 * Logs telemetry to backend for monitoring migration health across devices.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  LEGACY_KEY_MAP as KEY_MAP,
  PROTECTED_KEYS,
  MIGRATION_FLAGS,
  MIGRATION_KEY,
  LEGACY_PREFIX,
  NEW_PREFIX,
} from '@/config/storageMigration';

const MIGRATION_FLAG = MIGRATION_FLAGS.done;
const TELEMETRY_FLAG = MIGRATION_FLAGS.telemetrySent;
const SWEEP_FLAG = MIGRATION_FLAGS.sweepDone;
const EPOCH_KEY = MIGRATION_FLAGS.epoch;

// ============================================================================
// Runtime-extensible protected keys registry
// ----------------------------------------------------------------------------
// `PROTECTED_KEYS` from `@/config/storageMigration` is the static, version-
// controlled source of truth. The registry below adds a *runtime* layer on
// top of it so feature modules can register additional keys (or glob
// patterns) without editing the central config.
//
// Use cases:
//   • A new feature stores `faneen_my_feature_state` and wants to keep it
//     during the migration window — call `registerProtectedKey(...)` when
//     the feature module loads.
//   • An entire prefix family (e.g. `faneen_widget_*`) should be exempt —
//     call `registerProtectedPattern('faneen_widget_*')`.
//
// Both static and runtime entries are honoured by every sweep scope:
// localStorage, sessionStorage, and cookies.
// ============================================================================

/** Runtime-added exact key names. Cleared per process; not persisted. */
const runtimeProtectedKeys = new Set<string>();

/** Runtime-added wildcard patterns (compiled to RegExp). */
interface ProtectedPattern {
  readonly source: string;
  readonly regex: RegExp;
}
const runtimeProtectedPatterns: ProtectedPattern[] = [];

/**
 * Compiles a glob-like pattern into a RegExp. Supports:
 *   `*`  → any sequence of characters (incl. empty)
 *   `?`  → exactly one character
 * Anything else is treated as literal text (regex meta-chars escaped).
 */
function compileProtectedPattern(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex specials
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}

/**
 * Adds a key name to the runtime protected list. Idempotent.
 * Returns `true` if the key was newly registered, `false` if already present.
 */
export function registerProtectedKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  if (PROTECTED_KEYS.has(key) || runtimeProtectedKeys.has(key)) return false;
  runtimeProtectedKeys.add(key);
  return true;
}

/**
 * Bulk variant of `registerProtectedKey`. Returns the number of keys newly
 * added (duplicates and entries already present in the static config are
 * skipped silently).
 */
export function registerProtectedKeys(keys: readonly string[]): number {
  let added = 0;
  for (const k of keys) {
    if (registerProtectedKey(k)) added++;
  }
  return added;
}

/**
 * Adds a glob-like pattern (`*`, `?`) to the runtime protected list.
 * Returns `true` if the pattern was newly registered.
 */
export function registerProtectedPattern(glob: string): boolean {
  if (!glob || typeof glob !== 'string') return false;
  if (runtimeProtectedPatterns.some((p) => p.source === glob)) return false;
  runtimeProtectedPatterns.push({ source: glob, regex: compileProtectedPattern(glob) });
  return true;
}

/**
 * Removes a previously registered runtime key. Static config entries
 * cannot be unregistered (they are intentionally immutable). Returns
 * `true` if a runtime entry was removed.
 */
export function unregisterProtectedKey(key: string): boolean {
  return runtimeProtectedKeys.delete(key);
}

/** Removes a previously registered runtime pattern. */
export function unregisterProtectedPattern(glob: string): boolean {
  const idx = runtimeProtectedPatterns.findIndex((p) => p.source === glob);
  if (idx === -1) return false;
  runtimeProtectedPatterns.splice(idx, 1);
  return true;
}

/**
 * Clears all RUNTIME registrations. Static config keys remain protected.
 * Primarily useful in tests; never call from production code paths.
 */
export function _resetRuntimeProtectedKeys(): void {
  runtimeProtectedKeys.clear();
  runtimeProtectedPatterns.length = 0;
}

/**
 * Snapshot of the effective protected-keys configuration — combines the
 * static config with any runtime additions. Useful for admin UI and
 * debugging; does not expose internal mutable references.
 */
export function getProtectedKeysSnapshot(): {
  static: string[];
  runtime: string[];
  patterns: string[];
} {
  return {
    static: Array.from(PROTECTED_KEYS),
    runtime: Array.from(runtimeProtectedKeys),
    patterns: runtimeProtectedPatterns.map((p) => p.source),
  };
}

/**
 * Single decision point used by every sweep loop. Checks (in order):
 *   1. Static `PROTECTED_KEYS` from the central config.
 *   2. Runtime exact-name registrations.
 *   3. Runtime glob patterns.
 */
function isKeyProtected(key: string): boolean {
  if (PROTECTED_KEYS.has(key)) return true;
  if (runtimeProtectedKeys.has(key)) return true;
  for (const p of runtimeProtectedPatterns) {
    if (p.regex.test(key)) return true;
  }
  return false;
}

/**
 * Batch tuning. Sweeping large stores in one tight loop blocks the main thread
 * (every removeItem can force the browser to flush its storage index to disk).
 * We process keys in fixed-size chunks and yield to the event loop between
 * chunks so input/paint frames stay responsive on low-end devices.
 *
 * - BATCH_SIZE: number of keys handled per chunk before yielding.
 * - BATCH_THRESHOLD: below this total, run synchronously (no yield overhead).
 */
const BATCH_SIZE = 25;
const BATCH_THRESHOLD = 40;

/**
 * Yields control to the browser between batches so paint / input handlers
 * can run. Prefers requestIdleCallback when available, then MessageChannel
 * (microtask-faster than setTimeout(0)), then falls back to setTimeout.
 * Awaiting the returned promise is a no-op on Node test environments.
 */
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(() => resolve(), { timeout: 50 });
      return;
    }
    if (typeof MessageChannel !== 'undefined') {
      const ch = new MessageChannel();
      ch.port1.onmessage = () => resolve();
      ch.port2.postMessage(null);
      return;
    }
    setTimeout(resolve, 0);
  });
}

/**
 * Classified error codes for sweep failures. Stored in `migration_telemetry.error_code`
 * so admins can filter and triage issues quickly without parsing free-text messages.
 *
 * - storage_unavailable: localStorage / sessionStorage object missing (SSR, locked browser).
 * - permission_denied: Browser blocked access (Safari private mode, third-party cookie block).
 * - quota_exceeded: Storage write failed because quota is full.
 * - iteration_failed: Snapshotting keys via .key(i) threw unexpectedly.
 * - removal_failed: removeItem() threw on a specific key.
 * - cookie_unavailable: document or document.cookie inaccessible.
 * - unknown: Anything else not matching the above.
 */
export type SweepErrorCode =
  | 'storage_unavailable'
  | 'permission_denied'
  | 'quota_exceeded'
  | 'iteration_failed'
  | 'removal_failed'
  | 'cookie_unavailable'
  | 'unknown';

export interface SweepError {
  code: SweepErrorCode;
  message: string;
  scope: 'localStorage' | 'sessionStorage' | 'cookies';
}

/**
 * Phase of the sweep where a failure occurred. Used in the per-failure
 * diagnostic log so admins can pinpoint exactly which step broke (e.g.
 * the iteration loop, an individual removeItem, or the initial probe
 * that detected a permission-blocked storage backend).
 */
export type SweepPhase =
  | 'access_probe' // initial typeof / read/write probe to detect blocked storage
  | 'iterate'      // walking the storage index
  | 'read'         // getItem / cookie read
  | 'write'        // setItem (e.g. flag persistence) failed
  | 'remove'       // removeItem / cookie expiry write failed
  | 'flag'         // setting the SWEEP_FLAG sentinel
  | 'unknown';

/**
 * A single per-failure diagnostic entry. We collect these across every
 * sweep call so telemetry can ship a structured trail of *why* permission
 * problems occurred — not just a single combined error string.
 */
export interface SweepDiagnostic {
  ts: number;                     // epoch ms
  scope: SweepError['scope'];
  phase: SweepPhase;
  code: SweepErrorCode;
  message: string;
  key?: string;                   // affected key when applicable
  host?: string;                  // window.location.hostname snapshot
  path?: string;                  // window.location.pathname snapshot
}

/** Compact recorder used by sweep loops. */
interface DiagnosticRecorder {
  record: (entry: Omit<SweepDiagnostic, 'ts' | 'host' | 'path'>) => void;
  snapshot: () => SweepDiagnostic[];
}

function getLocationContext(): { host?: string; path?: string } {
  try {
    if (typeof window === 'undefined' || !window.location) return {};
    return {
      host: (window.location.hostname || '').toLowerCase() || undefined,
      path: window.location.pathname || undefined,
    };
  } catch {
    return {};
  }
}

function createDiagnosticRecorder(): DiagnosticRecorder {
  const log: SweepDiagnostic[] = [];
  return {
    record(entry) {
      const ctx = getLocationContext();
      log.push({
        ts: Date.now(),
        host: ctx.host,
        path: ctx.path,
        ...entry,
        message: (entry.message || '').slice(0, 240),
      });
    },
    snapshot: () => log.slice(),
  };
}

/**
 * Probes whether a Web Storage backend is actually usable. Some browsers
 * (Safari private mode, Firefox with strict cookie blocking) expose the
 * `localStorage` / `sessionStorage` global but throw on every read or
 * write. We perform a tiny round-trip with a sentinel key so we can
 * surface a `permission_denied` diagnostic *before* the main sweep loop
 * tries (and silently fails) hundreds of operations.
 */
function probeStorageAccess(
  scope: 'localStorage' | 'sessionStorage',
  recorder?: DiagnosticRecorder,
): SweepError | null {
  const probeKey = '__qitaat_probe__';
  try {
    const store = scope === 'localStorage' ? localStorage : sessionStorage;
    if (typeof store === 'undefined' || store === null) {
      const err: SweepError = {
        code: 'storage_unavailable',
        message: `${scope} is undefined in this environment`,
        scope,
      };
      recorder?.record({ scope, phase: 'access_probe', code: err.code, message: err.message });
      return err;
    }
    store.setItem(probeKey, '1');
    store.removeItem(probeKey);
    return null;
  } catch (err) {
    const cls = classifySweepError(err, scope);
    // A throw on probe is almost always an access problem, not a quota one.
    const code: SweepErrorCode = cls.code === 'unknown' ? 'permission_denied' : cls.code;
    recorder?.record({ scope, phase: 'access_probe', code, message: cls.message });
    return { ...cls, code };
  }
}

function probeCookieAccess(recorder?: DiagnosticRecorder): SweepError | null {
  try {
    if (typeof document === 'undefined') {
      const err: SweepError = {
        code: 'cookie_unavailable',
        message: 'document is undefined in this environment',
        scope: 'cookies',
      };
      recorder?.record({ scope: 'cookies', phase: 'access_probe', code: err.code, message: err.message });
      return err;
    }
    // Touch document.cookie — some embed contexts throw here.
    void document.cookie;
    return null;
  } catch (err) {
    const cls = classifySweepError(err, 'cookies');
    const code: SweepErrorCode = cls.code === 'unknown' ? 'permission_denied' : 'cookie_unavailable';
    recorder?.record({ scope: 'cookies', phase: 'access_probe', code, message: cls.message });
    return { ...cls, code };
  }
}

/**
 * Inspects an unknown thrown value and maps it to a stable error code so
 * downstream telemetry can group failures meaningfully.
 */
function classifySweepError(err: unknown, scope: SweepError['scope']): SweepError {
  const raw = err instanceof Error ? err : new Error(String(err));
  const name = raw.name || '';
  const msg = raw.message || '';
  const lower = `${name} ${msg}`.toLowerCase();

  let code: SweepErrorCode = 'unknown';
  if (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    lower.includes('quota')
  ) {
    code = 'quota_exceeded';
  } else if (
    name === 'SecurityError' ||
    lower.includes('denied') ||
    lower.includes('permission') ||
    lower.includes('access is denied')
  ) {
    code = 'permission_denied';
  } else if (
    lower.includes('is not defined') ||
    lower.includes('undefined') ||
    lower.includes('null') && lower.includes('storage')
  ) {
    code = 'storage_unavailable';
  }
  return { code, message: msg.slice(0, 500) || name || 'unknown error', scope };
}

/**
 * Sweeps any remaining `faneen_*` localStorage keys that weren't in KEY_MAP.
 * Runs once after the main migration. Returns count of swept keys.
 * Pass an optional `recorder` to capture per-failure diagnostics.
 */
function sweepLegacyKeys(
  recorder?: DiagnosticRecorder,
): { swept: number; sweptKeys: string[]; error?: SweepError } {
  const sweptKeys: string[] = [];
  try {
    const probe = probeStorageAccess('localStorage', recorder);
    if (probe) return { swept: 0, sweptKeys, error: probe };
    if (localStorage.getItem(SWEEP_FLAG) === '1') return { swept: 0, sweptKeys };

    // Snapshot keys first — mutating localStorage while iterating is unsafe
    const allKeys: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) allKeys.push(k);
      }
    } catch (iterErr) {
      const cls = classifySweepError(iterErr, 'localStorage');
      const code: SweepErrorCode = cls.code === 'unknown' ? 'iteration_failed' : cls.code;
      recorder?.record({ scope: 'localStorage', phase: 'iterate', code, message: cls.message });
      return {
        swept: sweptKeys.length,
        sweptKeys,
        error: { ...cls, code },
      };
    }

    for (const key of allKeys) {
      if (!key.startsWith(LEGACY_PREFIX)) continue;
      if (isKeyProtected(key)) continue;
      // Already handled by KEY_MAP — skip if a counterpart exists in qitaat_ namespace
      const counterpart = NEW_PREFIX + key.slice(LEGACY_PREFIX.length);
      try {
        if (localStorage.getItem(counterpart) !== null) {
          // Counterpart exists, safe to remove orphan
          localStorage.removeItem(key);
          sweptKeys.push(key);
          continue;
        }
        // No counterpart and not in KEY_MAP → unknown orphan, remove it
        localStorage.removeItem(key);
        sweptKeys.push(key);
      } catch (rmErr) {
        const cls = classifySweepError(rmErr, 'localStorage');
        const code: SweepErrorCode = cls.code === 'unknown' ? 'removal_failed' : cls.code;
        recorder?.record({ scope: 'localStorage', phase: 'remove', code, message: cls.message, key });
        return {
          swept: sweptKeys.length,
          sweptKeys,
          error: { ...cls, code },
        };
      }
    }

    try {
      localStorage.setItem(SWEEP_FLAG, '1');
    } catch (flagErr) {
      const cls = classifySweepError(flagErr, 'localStorage');
      recorder?.record({ scope: 'localStorage', phase: 'flag', code: cls.code, message: cls.message, key: SWEEP_FLAG });
      return {
        swept: sweptKeys.length,
        sweptKeys,
        error: cls,
      };
    }
  } catch (err) {
    const cls = classifySweepError(err, 'localStorage');
    recorder?.record({ scope: 'localStorage', phase: 'unknown', code: cls.code, message: cls.message });
    return {
      swept: sweptKeys.length,
      sweptKeys,
      error: cls,
    };
  }
  return { swept: sweptKeys.length, sweptKeys };
}

/**
 * Async / batched twin of `sweepLegacyKeys`. Yields between BATCH_SIZE
 * removals so the browser can paint and respond to input on low-end
 * hardware. For small stores (≤ BATCH_THRESHOLD legacy keys) it falls
 * through to the synchronous path to avoid scheduling overhead.
 */
async function sweepLegacyKeysBatched(
  recorder?: DiagnosticRecorder,
): Promise<{
  swept: number;
  sweptKeys: string[];
  error?: SweepError;
}> {
  const probe = probeStorageAccess('localStorage', recorder);
  if (probe) return { swept: 0, sweptKeys: [], error: probe };
  if (localStorage.getItem(SWEEP_FLAG) === '1') {
    return { swept: 0, sweptKeys: [] };
  }

  // Snapshot first
  const allKeys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) allKeys.push(k);
    }
  } catch (iterErr) {
    const cls = classifySweepError(iterErr, 'localStorage');
    const code: SweepErrorCode = cls.code === 'unknown' ? 'iteration_failed' : cls.code;
    recorder?.record({ scope: 'localStorage', phase: 'iterate', code, message: cls.message });
    return {
      swept: 0,
      sweptKeys: [],
      error: { ...cls, code },
    };
  }

  // Pre-filter to just the legacy candidates so the batch loop is tight
  const candidates = allKeys.filter(
    (k) => k.startsWith(LEGACY_PREFIX) && !isKeyProtected(k),
  );

  // Small workload — skip the async overhead
  if (candidates.length <= BATCH_THRESHOLD) {
    return sweepLegacyKeys(recorder);
  }

  const sweptKeys: string[] = [];
  for (let start = 0; start < candidates.length; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE, candidates.length);
    for (let i = start; i < end; i++) {
      const key = candidates[i];
      try {
        localStorage.removeItem(key);
        sweptKeys.push(key);
      } catch (rmErr) {
        const cls = classifySweepError(rmErr, 'localStorage');
        const code: SweepErrorCode = cls.code === 'unknown' ? 'removal_failed' : cls.code;
        recorder?.record({ scope: 'localStorage', phase: 'remove', code, message: cls.message, key });
        return {
          swept: sweptKeys.length,
          sweptKeys,
          error: { ...cls, code },
        };
      }
    }
    if (end < candidates.length) {
      // eslint-disable-next-line no-await-in-loop
      await yieldToEventLoop();
    }
  }

  try {
    localStorage.setItem(SWEEP_FLAG, '1');
  } catch (flagErr) {
    const cls = classifySweepError(flagErr, 'localStorage');
    recorder?.record({ scope: 'localStorage', phase: 'flag', code: cls.code, message: cls.message, key: SWEEP_FLAG });
    return {
      swept: sweptKeys.length,
      sweptKeys,
      error: cls,
    };
  }
  return { swept: sweptKeys.length, sweptKeys };
}

/**
 * Sweeps legacy `faneen_*` keys from sessionStorage. No counterpart copy
 * needed — sessionStorage is per-tab and contains no critical persistent data.
 */
function sweepSessionStorage(): { swept: number; sweptKeys: string[]; error?: SweepError } {
  const sweptKeys: string[] = [];
  try {
    if (typeof sessionStorage === 'undefined') {
      return {
        swept: 0,
        sweptKeys,
        error: {
          code: 'storage_unavailable',
          message: 'sessionStorage is undefined in this environment',
          scope: 'sessionStorage',
        },
      };
    }
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k) keys.push(k);
    }
    for (const key of keys) {
      if (!key.startsWith(LEGACY_PREFIX)) continue;
      if (isKeyProtected(key)) continue;
      sessionStorage.removeItem(key);
      sweptKeys.push(key);
    }
  } catch (err) {
    return {
      swept: sweptKeys.length,
      sweptKeys,
      error: classifySweepError(err, 'sessionStorage'),
    };
  }
  return { swept: sweptKeys.length, sweptKeys };
}

/**
 * Async / batched twin of `sweepSessionStorage`. Yields between BATCH_SIZE
 * removals to prevent jank on devices with large session stores.
 */
async function sweepSessionStorageBatched(): Promise<{
  swept: number;
  sweptKeys: string[];
  error?: SweepError;
}> {
  if (typeof sessionStorage === 'undefined') {
    return sweepSessionStorage();
  }
  const keys: string[] = [];
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k) keys.push(k);
    }
  } catch (err) {
    const cls = classifySweepError(err, 'sessionStorage');
    return {
      swept: 0,
      sweptKeys: [],
      error: { ...cls, code: cls.code === 'unknown' ? 'iteration_failed' : cls.code },
    };
  }
  const candidates = keys.filter(
    (k) => k.startsWith(LEGACY_PREFIX) && !isKeyProtected(k),
  );
  if (candidates.length <= BATCH_THRESHOLD) {
    return sweepSessionStorage();
  }

  const sweptKeys: string[] = [];
  for (let start = 0; start < candidates.length; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE, candidates.length);
    for (let i = start; i < end; i++) {
      try {
        sessionStorage.removeItem(candidates[i]);
        sweptKeys.push(candidates[i]);
      } catch (err) {
        const cls = classifySweepError(err, 'sessionStorage');
        return {
          swept: sweptKeys.length,
          sweptKeys,
          error: { ...cls, code: cls.code === 'unknown' ? 'removal_failed' : cls.code },
        };
      }
    }
    if (end < candidates.length) {
      // eslint-disable-next-line no-await-in-loop
      await yieldToEventLoop();
    }
  }
  return { swept: sweptKeys.length, sweptKeys };
}

/**
 * Computes every plausible domain scope a cookie may have been set on.
 * Browsers set cookies under: the exact host, the parent eTLD+1, and any
 * intermediate sub-domain. Trying them all maximises the chance the
 * `Set-Cookie` deletion request actually matches the original scope.
 *
 * Examples:
 *   www.app.qitaat.com → ['', 'www.app.qitaat.com', '.www.app.qitaat.com',
 *                         'app.qitaat.com', '.app.qitaat.com',
 *                         'qitaat.com', '.qitaat.com']
 *   localhost          → ['', 'localhost']
 *   192.168.1.10       → ['', '192.168.1.10']  (IP — no parent climb)
 */
function computeDomainScopes(host: string): string[] {
  const scopes = new Set<string>();
  scopes.add(''); // host-only cookie (no Domain attribute)
  if (!host) return Array.from(scopes);

  // IP literals: never climb parents
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':');
  if (isIp || host === 'localhost') {
    scopes.add(host);
    return Array.from(scopes);
  }

  const parts = host.split('.').filter(Boolean);
  // Walk up the domain tree, but stop before single-label TLDs (e.g. ".com")
  for (let i = 0; i <= parts.length - 2; i++) {
    const candidate = parts.slice(i).join('.');
    scopes.add(candidate);
    scopes.add('.' + candidate); // legacy leading-dot form (RFC 2109)
  }
  return Array.from(scopes);
}

/**
 * Computes plausible Path scopes a cookie may have been set on.
 * Most cookies use `/`, but some scoped cookies use the current pathname
 * or any of its ancestor segments.
 *
 * Examples:
 *   /dashboard/admin/migration → ['/', '/dashboard', '/dashboard/admin',
 *                                  '/dashboard/admin/migration']
 */
function computePathScopes(pathname: string): string[] {
  const scopes = new Set<string>(['/']);
  if (!pathname || pathname === '/') return Array.from(scopes);
  const segments = pathname.split('/').filter(Boolean);
  let current = '';
  for (const seg of segments) {
    current += '/' + seg;
    scopes.add(current);
  }
  return Array.from(scopes);
}

/**
 * Returns every cookie name that begins with the legacy prefix, supporting
 * three encoding forms a server might have used:
 *   1. raw bytes               → faneen_session
 *   2. percent-encoded         → faneen%5Fsession (rare but valid)
 *   3. fully encoded prefix    → %66%61%6E%65%65%6E_…  (defensive)
 *
 * Returns BOTH the decoded canonical name (for matching against
 * PROTECTED_KEYS / sweptKeys) and the original raw name (so the
 * deletion `Set-Cookie` byte-matches what the browser stored).
 */
function extractLegacyCookieNames(
  cookieHeader: string,
): Array<{ raw: string; decoded: string }> {
  const out: Array<{ raw: string; decoded: string }> = [];
  if (!cookieHeader) return out;

  for (const segment of cookieHeader.split(';')) {
    const eq = segment.indexOf('=');
    const raw = (eq > -1 ? segment.slice(0, eq) : segment).trim();
    if (!raw) continue;

    // Try to decode; fall back to raw if malformed (decodeURIComponent throws on bad %)
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      decoded = raw;
    }

    if (raw.startsWith(LEGACY_PREFIX) || decoded.startsWith(LEGACY_PREFIX)) {
      out.push({ raw, decoded });
    }
  }
  return out;
}

/**
 * Sweeps legacy `faneen_*` cookies on the current domain. Sets expired Max-Age
 * across every plausible (domain × path) combination, and supports
 * percent-encoded cookie names. Cookies on unrelated origins cannot be
 * cleared from JS — that's a browser security boundary.
 */
function sweepCookies(): { swept: number; sweptKeys: string[]; error?: SweepError } {
  const sweptKeys: string[] = [];
  try {
    if (typeof document === 'undefined') {
      return {
        swept: 0,
        sweptKeys,
        error: {
          code: 'cookie_unavailable',
          message: 'document is undefined in this environment',
          scope: 'cookies',
        },
      };
    }
    if (!document.cookie) return { swept: 0, sweptKeys };

    const host = (window.location.hostname || '').toLowerCase();
    const pathname = window.location.pathname || '/';
    const domainScopes = computeDomainScopes(host);
    const pathScopes = computePathScopes(pathname);
    const expiry = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
    const isHttps =
      typeof window.location !== 'undefined' && window.location.protocol === 'https:';

    const candidates = extractLegacyCookieNames(document.cookie);

    for (const { raw, decoded } of candidates) {
      // Protect canonical decoded name against the central protected list
      if (isKeyProtected(decoded) || isKeyProtected(raw)) continue;

      // Try every domain × path combination so we hit whichever scope
      // the original Set-Cookie actually used.
      for (const domain of domainScopes) {
        for (const path of pathScopes) {
          const domainAttr = domain ? `; domain=${domain}` : '';
          // Plain attempt
          document.cookie = `${raw}=; ${expiry}; path=${path}${domainAttr}`;
          // SameSite=Lax variant — modern browsers may otherwise ignore the deletion
          document.cookie = `${raw}=; ${expiry}; path=${path}${domainAttr}; SameSite=Lax`;
          // Secure variant for HTTPS-only cookies (must include Secure to overwrite)
          if (isHttps) {
            document.cookie = `${raw}=; ${expiry}; path=${path}${domainAttr}; SameSite=None; Secure`;
          }
          // Also overwrite the decoded form in case the browser stores it differently
          if (decoded !== raw) {
            document.cookie = `${decoded}=; ${expiry}; path=${path}${domainAttr}`;
          }
        }
      }

      // Record the canonical (decoded) name for telemetry & UI clarity
      sweptKeys.push(decoded);
    }
  } catch (err) {
    return {
      swept: sweptKeys.length,
      sweptKeys,
      error: { ...classifySweepError(err, 'cookies'), code: 'cookie_unavailable' },
    };
  }
  return { swept: sweptKeys.length, sweptKeys };
}

/**
 * Async / batched twin of `sweepCookies`. Each cookie expansion produces
 * `domains × paths × variants` `document.cookie` writes — that's the most
 * jank-prone part of the sweep. We yield every BATCH_SIZE *cookies* (not
 * writes) so the browser stays responsive even on deep paths.
 */
async function sweepCookiesBatched(): Promise<{
  swept: number;
  sweptKeys: string[];
  error?: SweepError;
}> {
  if (typeof document === 'undefined') {
    return sweepCookies();
  }
  const cookieHeader = document.cookie;
  if (!cookieHeader) return { swept: 0, sweptKeys: [] };

  const candidates = extractLegacyCookieNames(cookieHeader).filter(
    ({ raw, decoded }) =>
      !isKeyProtected(decoded) && !isKeyProtected(raw),
  );
  if (candidates.length <= BATCH_THRESHOLD) {
    return sweepCookies();
  }

  const sweptKeys: string[] = [];
  try {
    const host = (window.location.hostname || '').toLowerCase();
    const pathname = window.location.pathname || '/';
    const domainScopes = computeDomainScopes(host);
    const pathScopes = computePathScopes(pathname);
    const expiry = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
    const isHttps = window.location.protocol === 'https:';

    for (let start = 0; start < candidates.length; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE, candidates.length);
      for (let i = start; i < end; i++) {
        const { raw, decoded } = candidates[i];
        for (const domain of domainScopes) {
          for (const path of pathScopes) {
            const domainAttr = domain ? `; domain=${domain}` : '';
            document.cookie = `${raw}=; ${expiry}; path=${path}${domainAttr}`;
            document.cookie = `${raw}=; ${expiry}; path=${path}${domainAttr}; SameSite=Lax`;
            if (isHttps) {
              document.cookie = `${raw}=; ${expiry}; path=${path}${domainAttr}; SameSite=None; Secure`;
            }
            if (decoded !== raw) {
              document.cookie = `${decoded}=; ${expiry}; path=${path}${domainAttr}`;
            }
          }
        }
        sweptKeys.push(decoded);
      }
      if (end < candidates.length) {
        // eslint-disable-next-line no-await-in-loop
        await yieldToEventLoop();
      }
    }
  } catch (err) {
    return {
      swept: sweptKeys.length,
      sweptKeys,
      error: { ...classifySweepError(err, 'cookies'), code: 'cookie_unavailable' },
    };
  }
  return { swept: sweptKeys.length, sweptKeys };
}

type MigrationStatus = 'success' | 'failed' | 'skipped' | 'no_legacy_data';

/**
 * Combines multiple sweep errors into a single error_code + readable message.
 * Priority: most-severe scope wins (localStorage > sessionStorage > cookies).
 */
function combineSweepErrors(errors: Array<SweepError | undefined>): {
  code: SweepErrorCode | null;
  message: string | null;
} {
  const real = errors.filter((e): e is SweepError => !!e);
  if (real.length === 0) return { code: null, message: null };
  const priority: SweepError['scope'][] = ['localStorage', 'sessionStorage', 'cookies'];
  real.sort((a, b) => priority.indexOf(a.scope) - priority.indexOf(b.scope));
  const primary = real[0];
  const summary = real.map((e) => `[${e.scope}:${e.code}] ${e.message}`).join(' | ');
  return { code: primary.code, message: summary.slice(0, 1000) };
}

async function logTelemetry(
  status: MigrationStatus,
  keysMigrated: number,
  errorMessage?: string,
  options?: { force?: boolean; errorCode?: SweepErrorCode | null },
): Promise<void> {
  try {
    if (!options?.force && localStorage.getItem(TELEMETRY_FLAG) === '1') return;
    const ua = (navigator?.userAgent || '').slice(0, 500);
    const { error } = await supabase.from('migration_telemetry').insert({
      migration_key: MIGRATION_KEY,
      status,
      keys_migrated: keysMigrated,
      user_agent: ua,
      error_message: errorMessage?.slice(0, 1000) || null,
      error_code: options?.errorCode ? options.errorCode.slice(0, 64) : null,
    });
    if (!error) {
      localStorage.setItem(TELEMETRY_FLAG, '1');
    } else if (import.meta.env.DEV) {
      console.warn('[storage-migration] Telemetry failed:', error.message);
    }
  } catch {
    // Silent — telemetry must never break boot
  }
}

export function migrateLegacyStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const alreadyDone = localStorage.getItem(MIGRATION_FLAG) === '1';
    if (alreadyDone) {
      // Still attempt telemetry for previously-migrated devices that never reported
      void logTelemetry('skipped', 0);
      // Check server-controlled epoch — if admin bumped it, force a re-run in background
      void checkServerEpochAndRerun();
      return;
    }

    let migrated = 0;
    for (const [oldKey, newKey] of Object.entries(KEY_MAP)) {
      const oldValue = localStorage.getItem(oldKey);
      if (oldValue !== null) {
        // Only set new key if it doesn't already exist (don't overwrite fresher data)
        if (localStorage.getItem(newKey) === null) {
          localStorage.setItem(newKey, oldValue);
        }
        localStorage.removeItem(oldKey);
        migrated++;
      }
    }

    localStorage.setItem(MIGRATION_FLAG, '1');

    // Sweep any remaining unknown faneen_* orphans (e.g. from older app versions)
    const localResult = sweepLegacyKeys();
    const session = sweepSessionStorage();
    const cookies = sweepCookies();
    const { swept, sweptKeys } = localResult;
    const totalCleaned = migrated + swept + session.swept + cookies.swept;
    const combined = combineSweepErrors([localResult.error, session.error, cookies.error]);

    if (import.meta.env.DEV) {
      if (migrated > 0) {
        console.info(`[storage-migration] Migrated ${migrated} legacy faneen_* key(s) to qitaat_*`);
      }
      if (swept > 0) {
        console.info(`[storage-migration] Swept ${swept} orphan faneen_* key(s):`, sweptKeys);
      }
      if (session.swept > 0) {
        console.info(`[storage-migration] Swept ${session.swept} sessionStorage key(s):`, session.sweptKeys);
      }
      if (cookies.swept > 0) {
        console.info(`[storage-migration] Swept ${cookies.swept} cookie(s):`, cookies.sweptKeys);
      }
      if (combined.code) {
        console.warn(`[storage-migration] Sweep encountered ${combined.code}:`, combined.message);
      }
    }

    if (combined.code) {
      void logTelemetry('failed', totalCleaned, combined.message ?? undefined, {
        errorCode: combined.code,
      });
    } else {
      void logTelemetry(totalCleaned > 0 ? 'success' : 'no_legacy_data', totalCleaned);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (import.meta.env.DEV) {
      console.warn('[storage-migration] Failed:', err);
    }
    void logTelemetry('failed', 0, msg, { errorCode: 'unknown' });
  }
}

/**
 * Reads the server-controlled migration epoch and, if it is newer than the
 * one stored locally, clears the migration flags and runs migration again.
 * This lets an admin force every device to re-execute the migration on its
 * next boot — and produces a fresh telemetry event per device.
 */
async function checkServerEpochAndRerun(): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('get_migration_epoch');
    if (error || data == null) return;
    const serverEpoch = Number(data);
    if (!Number.isFinite(serverEpoch) || serverEpoch < 1) return;

    const localEpochRaw = localStorage.getItem(EPOCH_KEY);
    const localEpoch = localEpochRaw ? Number(localEpochRaw) : 1;

    // First boot after this feature ships: just record current epoch, don't re-run
    if (localEpochRaw === null) {
      localStorage.setItem(EPOCH_KEY, String(serverEpoch));
      return;
    }

    if (serverEpoch <= localEpoch) return;

    if (import.meta.env.DEV) {
      console.info(
        `[storage-migration] Server epoch ${serverEpoch} > local ${localEpoch}. Re-running…`,
      );
    }

    // Reset all gating flags so the next call re-runs from scratch
    localStorage.removeItem(MIGRATION_FLAG);
    localStorage.removeItem(SWEEP_FLAG);
    localStorage.removeItem(TELEMETRY_FLAG);

    // Persist the new epoch BEFORE re-running so we don't loop on failure
    localStorage.setItem(EPOCH_KEY, String(serverEpoch));

    // Re-run the migration synchronously; it will log a fresh telemetry event
    runMigrationCore({ forced: true, epoch: serverEpoch });
  } catch {
    // Silent — never break boot
  }
}

/**
 * Internal core that performs the migration steps and logs telemetry.
 * Extracted so it can be invoked both on first boot and on forced re-runs.
 */
function runMigrationCore(opts: { forced?: boolean; epoch?: number } = {}): void {
  // Kick off async batched core; never await — boot must stay non-blocking
  void runMigrationCoreAsync(opts);
}

async function runMigrationCoreAsync(
  opts: { forced?: boolean; epoch?: number } = {},
): Promise<void> {
  try {
    let migrated = 0;
    for (const [oldKey, newKey] of Object.entries(KEY_MAP)) {
      const oldValue = localStorage.getItem(oldKey);
      if (oldValue !== null) {
        if (localStorage.getItem(newKey) === null) {
          localStorage.setItem(newKey, oldValue);
        }
        localStorage.removeItem(oldKey);
        migrated++;
      }
    }
    localStorage.setItem(MIGRATION_FLAG, '1');

    const localResult = await sweepLegacyKeysBatched();
    const session = await sweepSessionStorageBatched();
    const cookies = await sweepCookiesBatched();
    const totalCleaned = migrated + localResult.swept + session.swept + cookies.swept;
    const combined = combineSweepErrors([localResult.error, session.error, cookies.error]);

    if (combined.code) {
      void logTelemetry('failed', totalCleaned, combined.message ?? undefined, {
        force: !!opts.forced,
        errorCode: combined.code,
      });
    } else {
      const status = totalCleaned > 0 ? 'success' : 'no_legacy_data';
      void logTelemetry(
        status,
        totalCleaned,
        opts.forced ? `forced re-run (epoch ${opts.epoch ?? '?'})` : undefined,
        { force: !!opts.forced },
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    void logTelemetry('failed', 0, msg, { force: !!opts.forced, errorCode: 'unknown' });
  }
}

/**
 * Result of a manual migration run, returned to the DEV-only admin UI.
 */
export interface ManualMigrationResult {
  migrated: number;
  migratedKeys: string[];
  sweptLocal: number;
  sweptLocalKeys: string[];
  sweptSession: number;
  sweptSessionKeys: string[];
  sweptCookies: number;
  sweptCookieKeys: string[];
  totalCleaned: number;
  status: MigrationStatus;
  errorCode: SweepErrorCode | null;
  errorMessage: string | null;
  durationMs: number;
  ranAt: string; // ISO timestamp
}

/**
 * Runs the migration synchronously and returns a detailed summary.
 * Resets gating flags first so the run is always a true retry.
 * INTENDED FOR DEV ADMIN UI ONLY — not called during normal boot.
 */
export async function runMigrationManually(): Promise<ManualMigrationResult> {
  const startedAt = Date.now();
  const ranAt = new Date(startedAt).toISOString();

  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      migrated: 0, migratedKeys: [],
      sweptLocal: 0, sweptLocalKeys: [],
      sweptSession: 0, sweptSessionKeys: [],
      sweptCookies: 0, sweptCookieKeys: [],
      totalCleaned: 0,
      status: 'failed',
      errorCode: 'storage_unavailable',
      errorMessage: 'window or localStorage is unavailable',
      durationMs: 0,
      ranAt,
    };
  }

  // Force a fresh run — clear gating flags
  try {
    localStorage.removeItem(MIGRATION_FLAG);
    localStorage.removeItem(SWEEP_FLAG);
    localStorage.removeItem(TELEMETRY_FLAG);
  } catch {
    // Best effort — proceed even if removal fails
  }

  const migratedKeys: string[] = [];
  let migrated = 0;
  let topLevelError: { code: SweepErrorCode; message: string } | null = null;

  try {
    for (const [oldKey, newKey] of Object.entries(KEY_MAP)) {
      const oldValue = localStorage.getItem(oldKey);
      if (oldValue !== null) {
        if (localStorage.getItem(newKey) === null) {
          localStorage.setItem(newKey, oldValue);
        }
        localStorage.removeItem(oldKey);
        migrated++;
        migratedKeys.push(oldKey);
      }
    }
    localStorage.setItem(MIGRATION_FLAG, '1');
  } catch (err) {
    const cls = classifySweepError(err, 'localStorage');
    topLevelError = { code: cls.code, message: cls.message };
  }

  const localResult = await sweepLegacyKeysBatched();
  const session = await sweepSessionStorageBatched();
  const cookies = await sweepCookiesBatched();
  const combined = combineSweepErrors([
    topLevelError ? { ...topLevelError, scope: 'localStorage' } : undefined,
    localResult.error,
    session.error,
    cookies.error,
  ]);
  const totalCleaned = migrated + localResult.swept + session.swept + cookies.swept;

  let status: MigrationStatus;
  if (combined.code) status = 'failed';
  else if (totalCleaned > 0) status = 'success';
  else status = 'no_legacy_data';

  // Log a fresh telemetry event so the admin dashboard reflects this manual run
  void logTelemetry(status, totalCleaned, combined.message ?? undefined, {
    force: true,
    errorCode: combined.code,
  });

  return {
    migrated,
    migratedKeys,
    sweptLocal: localResult.swept,
    sweptLocalKeys: localResult.sweptKeys,
    sweptSession: session.swept,
    sweptSessionKeys: session.sweptKeys,
    sweptCookies: cookies.swept,
    sweptCookieKeys: cookies.sweptKeys,
    totalCleaned,
    status,
    errorCode: combined.code,
    errorMessage: combined.message,
    durationMs: Date.now() - startedAt,
    ranAt,
  };
}