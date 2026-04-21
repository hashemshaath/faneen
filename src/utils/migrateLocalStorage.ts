/**
 * Migrates legacy `faneen_*` localStorage keys to `qitaat_*` namespace.
 * Preserves user data, then removes old keys. Idempotent — safe to call on every boot.
 * Logs telemetry to backend for monitoring migration health across devices.
 */
import { supabase } from '@/integrations/supabase/client';

const KEY_MAP: Record<string, string> = {
  faneen_lang: 'qitaat_lang',
  faneen_search_history: 'qitaat_search_history',
};

const MIGRATION_FLAG = 'qitaat_migration_v1_done';
const TELEMETRY_FLAG = 'qitaat_migration_v1_telemetry_sent';
const SWEEP_FLAG = 'qitaat_migration_v1_sweep_done';
const MIGRATION_KEY = 'localStorage_faneen_to_qitaat';

/**
 * Keys we never delete even if they appear orphaned — protected core data.
 * Add critical legacy keys here if discovered later.
 */
const PROTECTED_KEYS = new Set<string>([
  // Already handled via KEY_MAP, but keep as defense-in-depth
  'faneen_lang',
  'faneen_search_history',
]);

/**
 * Sweeps any remaining `faneen_*` localStorage keys that weren't in KEY_MAP.
 * Runs once after the main migration. Returns count of swept keys.
 */
function sweepLegacyKeys(): { swept: number; sweptKeys: string[] } {
  const sweptKeys: string[] = [];
  try {
    if (localStorage.getItem(SWEEP_FLAG) === '1') return { swept: 0, sweptKeys };

    // Snapshot keys first — mutating localStorage while iterating is unsafe
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) allKeys.push(k);
    }

    for (const key of allKeys) {
      if (!key.startsWith('faneen_')) continue;
      if (PROTECTED_KEYS.has(key)) continue;
      // Already handled by KEY_MAP — skip if a counterpart exists in qitaat_ namespace
      const counterpart = 'qitaat_' + key.slice('faneen_'.length);
      if (localStorage.getItem(counterpart) !== null) {
        // Counterpart exists, safe to remove orphan
        localStorage.removeItem(key);
        sweptKeys.push(key);
        continue;
      }
      // No counterpart and not in KEY_MAP → unknown orphan, remove it
      localStorage.removeItem(key);
      sweptKeys.push(key);
    }

    localStorage.setItem(SWEEP_FLAG, '1');
  } catch {
    // Silent — sweep is best-effort
  }
  return { swept: sweptKeys.length, sweptKeys };
}

/**
 * Sweeps legacy `faneen_*` keys from sessionStorage. No counterpart copy
 * needed — sessionStorage is per-tab and contains no critical persistent data.
 */
function sweepSessionStorage(): { swept: number; sweptKeys: string[] } {
  const sweptKeys: string[] = [];
  try {
    if (typeof sessionStorage === 'undefined') return { swept: 0, sweptKeys };
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k) keys.push(k);
    }
    for (const key of keys) {
      if (!key.startsWith('faneen_')) continue;
      sessionStorage.removeItem(key);
      sweptKeys.push(key);
    }
  } catch {
    // Silent
  }
  return { swept: sweptKeys.length, sweptKeys };
}

/**
 * Sweeps legacy `faneen_*` cookies on the current domain. Sets expired Max-Age
 * across plausible path scopes. Cookies on unrelated origins cannot be cleared
 * from JS — that's a browser security boundary.
 */
function sweepCookies(): { swept: number; sweptKeys: string[] } {
  const sweptKeys: string[] = [];
  try {
    if (typeof document === 'undefined' || !document.cookie) return { swept: 0, sweptKeys };
    const cookies = document.cookie.split(';');
    const host = window.location.hostname;
    // Compute parent domain for cookies set with a leading dot
    const parts = host.split('.');
    const parentDomain = parts.length > 1 ? '.' + parts.slice(-2).join('.') : host;

    for (const raw of cookies) {
      const eq = raw.indexOf('=');
      const name = (eq > -1 ? raw.slice(0, eq) : raw).trim();
      if (!name.startsWith('faneen_')) continue;
      // Try multiple path/domain combinations to maximize cleanup coverage
      const expiry = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = `${name}=; ${expiry}; path=/`;
      document.cookie = `${name}=; ${expiry}; path=/; domain=${host}`;
      document.cookie = `${name}=; ${expiry}; path=/; domain=${parentDomain}`;
      sweptKeys.push(name);
    }
  } catch {
    // Silent
  }
  return { swept: sweptKeys.length, sweptKeys };
}

type MigrationStatus = 'success' | 'failed' | 'skipped' | 'no_legacy_data';

async function logTelemetry(
  status: MigrationStatus,
  keysMigrated: number,
  errorMessage?: string,
): Promise<void> {
  try {
    if (localStorage.getItem(TELEMETRY_FLAG) === '1') return;
    const ua = (navigator?.userAgent || '').slice(0, 500);
    const { error } = await supabase.from('migration_telemetry').insert({
      migration_key: MIGRATION_KEY,
      status,
      keys_migrated: keysMigrated,
      user_agent: ua,
      error_message: errorMessage?.slice(0, 1000) || null,
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
    const { swept, sweptKeys } = sweepLegacyKeys();
    const session = sweepSessionStorage();
    const cookies = sweepCookies();
    const totalCleaned = migrated + swept + session.swept + cookies.swept;

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
    }

    void logTelemetry(totalCleaned > 0 ? 'success' : 'no_legacy_data', totalCleaned);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (import.meta.env.DEV) {
      console.warn('[storage-migration] Failed:', err);
    }
    void logTelemetry('failed', 0, msg);
  }
}