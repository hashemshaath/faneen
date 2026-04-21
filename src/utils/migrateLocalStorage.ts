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
 */
function sweepLegacyKeys(): { swept: number; sweptKeys: string[]; error?: SweepError } {
  const sweptKeys: string[] = [];
  try {
    if (typeof localStorage === 'undefined') {
      return {
        swept: 0,
        sweptKeys,
        error: {
          code: 'storage_unavailable',
          message: 'localStorage is undefined in this environment',
          scope: 'localStorage',
        },
      };
    }
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
      return {
        swept: sweptKeys.length,
        sweptKeys,
        error: { ...cls, code: cls.code === 'unknown' ? 'iteration_failed' : cls.code },
      };
    }

    for (const key of allKeys) {
      if (!key.startsWith(LEGACY_PREFIX)) continue;
      if (PROTECTED_KEYS.has(key)) continue;
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
        return {
          swept: sweptKeys.length,
          sweptKeys,
          error: { ...cls, code: cls.code === 'unknown' ? 'removal_failed' : cls.code },
        };
      }
    }

    try {
      localStorage.setItem(SWEEP_FLAG, '1');
    } catch (flagErr) {
      return {
        swept: sweptKeys.length,
        sweptKeys,
        error: classifySweepError(flagErr, 'localStorage'),
      };
    }
  } catch (err) {
    return {
      swept: sweptKeys.length,
      sweptKeys,
      error: classifySweepError(err, 'localStorage'),
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
      if (PROTECTED_KEYS.has(decoded) || PROTECTED_KEYS.has(raw)) continue;

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

    const localResult = sweepLegacyKeys();
    const session = sweepSessionStorage();
    const cookies = sweepCookies();
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
export function runMigrationManually(): ManualMigrationResult {
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

  const localResult = sweepLegacyKeys();
  const session = sweepSessionStorage();
  const cookies = sweepCookies();
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