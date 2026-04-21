/**
 * Central configuration for the localStorage / sessionStorage / cookie
 * migration from the legacy `faneen_*` namespace to the new `qitaat_*`
 * namespace.
 *
 * Edit this file to:
 *   - Add or remove protected keys (PROTECTED_KEY_ENTRIES)
 *   - Map additional legacy keys to new ones (LEGACY_KEY_MAP)
 *   - Tweak the prefixes if the brand changes again
 *
 * All consumers (sweep logic, admin UI, tests) must read from here so the
 * source of truth stays in one place.
 */

export const LEGACY_PREFIX = 'faneen_';
export const NEW_PREFIX = 'qitaat_';

/**
 * Maps a legacy key → its new counterpart. Values are migrated 1:1; if the
 * new key already exists, the legacy value is discarded (fresh wins).
 */
export const LEGACY_KEY_MAP: Readonly<Record<string, string>> = Object.freeze({
  faneen_lang: 'qitaat_lang',
  faneen_search_history: 'qitaat_search_history',
});

export type ProtectedKeyCategory = 'core' | 'auth' | 'preferences' | 'cache' | 'other';

/**
 * Description for each protected key, surfaced in the admin UI so future
 * editors understand WHY a key is protected before removing it.
 */
export interface ProtectedKeyEntry {
  key: string;
  reason_ar: string;
  reason_en: string;
  category: ProtectedKeyCategory;
}

/**
 * Keys the sweep step must NEVER delete, even if they appear orphaned.
 * Defense-in-depth on top of LEGACY_KEY_MAP.
 *
 * IMPORTANT: keep this list small and intentional. Adding a key here means
 * the sweep will skip it forever (until removed from this list).
 */
export const PROTECTED_KEY_ENTRIES: readonly ProtectedKeyEntry[] = Object.freeze([
  {
    key: 'faneen_lang',
    category: 'core',
    reason_ar: 'لغة الواجهة — يُرحَّل إلى qitaat_lang ويجب الحفاظ عليه أثناء الترحيل.',
    reason_en: 'UI language — migrated to qitaat_lang; must be preserved during migration.',
  },
  {
    key: 'faneen_search_history',
    category: 'core',
    reason_ar: 'سجل عمليات البحث — يحتوي بيانات المستخدم ويجب ترحيله بأمان.',
    reason_en: 'Search history — contains user data; must be migrated safely.',
  },
]);

/**
 * Flat Set of protected key names — used internally by the sweep loop.
 */
export const PROTECTED_KEYS: ReadonlySet<string> = new Set(
  PROTECTED_KEY_ENTRIES.map((e) => e.key),
);

/**
 * Storage flag keys that gate the migration steps. Centralized so admin
 * tooling can clear/inspect them consistently.
 */
export const MIGRATION_FLAGS = Object.freeze({
  done: 'qitaat_migration_v1_done',
  telemetrySent: 'qitaat_migration_v1_telemetry_sent',
  sweepDone: 'qitaat_migration_v1_sweep_done',
  epoch: 'qitaat_migration_epoch',
});

export const MIGRATION_KEY = 'localStorage_faneen_to_qitaat';
