/**
 * Migrates legacy `faneen_*` localStorage keys to `qitaat_*` namespace.
 * Preserves user data, then removes old keys. Idempotent — safe to call on every boot.
 */
const KEY_MAP: Record<string, string> = {
  faneen_lang: 'qitaat_lang',
  faneen_search_history: 'qitaat_search_history',
};

const MIGRATION_FLAG = 'qitaat_migration_v1_done';

export function migrateLegacyStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    if (localStorage.getItem(MIGRATION_FLAG) === '1') return;

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
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[storage-migration] Failed:', err);
    }
  }
}