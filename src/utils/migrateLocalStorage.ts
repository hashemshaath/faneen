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
const MIGRATION_KEY = 'localStorage_faneen_to_qitaat';

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

    if (migrated > 0 && import.meta.env.DEV) {
      console.info(`[storage-migration] Migrated ${migrated} legacy faneen_* key(s) to qitaat_*`);
    }

    void logTelemetry(migrated > 0 ? 'success' : 'no_legacy_data', migrated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (import.meta.env.DEV) {
      console.warn('[storage-migration] Failed:', err);
    }
    void logTelemetry('failed', 0, msg);
  }
}