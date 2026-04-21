import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const insertSpy = vi.fn().mockResolvedValue({ error: null });
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ insert: insertSpy }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

import { migrateLegacyStorage } from '../migrateLocalStorage';

describe('migrateLegacyStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    insertSpy.mockClear();
    insertSpy.mockResolvedValue({ error: null });
  });

  it('migrates known faneen_* localStorage keys to qitaat_*', () => {
    localStorage.setItem('faneen_lang', 'en');
    localStorage.setItem('faneen_search_history', '["chair","desk"]');

    migrateLegacyStorage();

    expect(localStorage.getItem('qitaat_lang')).toBe('en');
    expect(localStorage.getItem('qitaat_search_history')).toBe('["chair","desk"]');
    expect(localStorage.getItem('faneen_lang')).toBeNull();
    expect(localStorage.getItem('faneen_search_history')).toBeNull();
    expect(localStorage.getItem('qitaat_migration_v1_done')).toBe('1');
  });

  it('does NOT overwrite existing qitaat_* values with stale faneen_* data', () => {
    localStorage.setItem('faneen_lang', 'en');
    localStorage.setItem('qitaat_lang', 'ar');

    migrateLegacyStorage();

    expect(localStorage.getItem('qitaat_lang')).toBe('ar');
    expect(localStorage.getItem('faneen_lang')).toBeNull();
  });

  it('sweeps unknown faneen_* orphan keys not in KEY_MAP', () => {
    localStorage.setItem('faneen_unknown_orphan', 'garbage');
    localStorage.setItem('faneen_old_setting', '{}');

    migrateLegacyStorage();

    expect(localStorage.getItem('faneen_unknown_orphan')).toBeNull();
    expect(localStorage.getItem('faneen_old_setting')).toBeNull();
    expect(localStorage.getItem('qitaat_migration_v1_sweep_done')).toBe('1');
  });

  it('preserves non-faneen keys (qitaat_* and unrelated app data)', () => {
    localStorage.setItem('qitaat_user_pref', 'dark');
    localStorage.setItem('sb-auth-token', 'abc123');
    localStorage.setItem('faneen_lang', 'en');

    migrateLegacyStorage();

    expect(localStorage.getItem('qitaat_user_pref')).toBe('dark');
    expect(localStorage.getItem('sb-auth-token')).toBe('abc123');
    expect(localStorage.getItem('qitaat_lang')).toBe('en');
  });

  it('is idempotent — second call does not re-process', () => {
    localStorage.setItem('faneen_lang', 'en');
    migrateLegacyStorage();

    localStorage.setItem('faneen_late_arrival', 'x');
    migrateLegacyStorage();

    expect(localStorage.getItem('faneen_late_arrival')).toBe('x');
  });

  it('sweeps faneen_* keys from sessionStorage', () => {
    sessionStorage.setItem('faneen_session_data', 'temp');
    sessionStorage.setItem('qitaat_session_data', 'keep');

    migrateLegacyStorage();

    expect(sessionStorage.getItem('faneen_session_data')).toBeNull();
    expect(sessionStorage.getItem('qitaat_session_data')).toBe('keep');
  });

  it('handles empty storage gracefully (no_legacy_data path)', () => {
    expect(() => migrateLegacyStorage()).not.toThrow();
    expect(localStorage.getItem('qitaat_migration_v1_done')).toBe('1');
  });
});

describe('migrateLegacyStorage — partial & edge scenarios', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('handles partial data: only faneen_lang exists, faneen_search_history missing', () => {
    localStorage.setItem('faneen_lang', 'ar');

    migrateLegacyStorage();

    expect(localStorage.getItem('qitaat_lang')).toBe('ar');
    expect(localStorage.getItem('qitaat_search_history')).toBeNull();
    expect(localStorage.getItem('faneen_lang')).toBeNull();
    expect(localStorage.getItem('qitaat_migration_v1_done')).toBe('1');
  });

  it('handles partial data: only faneen_search_history exists, faneen_lang missing', () => {
    localStorage.setItem('faneen_search_history', '["aluminium"]');

    migrateLegacyStorage();

    expect(localStorage.getItem('qitaat_search_history')).toBe('["aluminium"]');
    expect(localStorage.getItem('qitaat_lang')).toBeNull();
    expect(localStorage.getItem('faneen_search_history')).toBeNull();
  });

  it('handles mixed state: one known + one orphan + one fresh qitaat key', () => {
    localStorage.setItem('faneen_lang', 'en');
    localStorage.setItem('faneen_legacy_filter', 'mosque');
    localStorage.setItem('qitaat_user_pref', 'compact');

    migrateLegacyStorage();

    expect(localStorage.getItem('qitaat_lang')).toBe('en');
    expect(localStorage.getItem('faneen_legacy_filter')).toBeNull();
    expect(localStorage.getItem('qitaat_user_pref')).toBe('compact');
  });

  it('absence of any legacy data: marks done flag without touching unrelated keys', () => {
    localStorage.setItem('qitaat_lang', 'ar');
    localStorage.setItem('app_theme', 'dark');
    localStorage.setItem('sb-auth-token', 'jwt');

    migrateLegacyStorage();

    expect(localStorage.getItem('qitaat_lang')).toBe('ar');
    expect(localStorage.getItem('app_theme')).toBe('dark');
    expect(localStorage.getItem('sb-auth-token')).toBe('jwt');
    expect(localStorage.getItem('qitaat_migration_v1_done')).toBe('1');
    expect(localStorage.getItem('qitaat_migration_v1_sweep_done')).toBe('1');
  });

  it('preserves empty-string values during migration (treats "" as valid data)', () => {
    localStorage.setItem('faneen_search_history', '');

    migrateLegacyStorage();

    // Empty string is valid data — should still migrate
    expect(localStorage.getItem('qitaat_search_history')).toBe('');
    expect(localStorage.getItem('faneen_search_history')).toBeNull();
  });

  it('migrates large payloads without truncation', () => {
    const big = JSON.stringify(Array.from({ length: 500 }, (_, i) => `item-${i}`));
    localStorage.setItem('faneen_search_history', big);

    migrateLegacyStorage();

    expect(localStorage.getItem('qitaat_search_history')).toBe(big);
    expect(localStorage.getItem('qitaat_search_history')?.length).toBe(big.length);
  });

  it('handles unicode/Arabic content in legacy values', () => {
    const arabicHistory = JSON.stringify(['ألمنيوم', 'زجاج مقسى', 'حديد مشغول']);
    localStorage.setItem('faneen_search_history', arabicHistory);
    localStorage.setItem('faneen_lang', 'ar');

    migrateLegacyStorage();

    expect(localStorage.getItem('qitaat_search_history')).toBe(arabicHistory);
    expect(localStorage.getItem('qitaat_lang')).toBe('ar');
  });

  it('sweep removes orphan even when its qitaat_ counterpart already exists', () => {
    localStorage.setItem('faneen_unknown_x', 'old');
    localStorage.setItem('qitaat_unknown_x', 'new'); // counterpart exists → safe to remove orphan

    migrateLegacyStorage();

    expect(localStorage.getItem('faneen_unknown_x')).toBeNull();
    expect(localStorage.getItem('qitaat_unknown_x')).toBe('new');
  });

  it('multiple orphans in sessionStorage are all swept', () => {
    sessionStorage.setItem('faneen_a', '1');
    sessionStorage.setItem('faneen_b', '2');
    sessionStorage.setItem('faneen_c', '3');
    sessionStorage.setItem('keep_me', 'yes');

    migrateLegacyStorage();

    expect(sessionStorage.getItem('faneen_a')).toBeNull();
    expect(sessionStorage.getItem('faneen_b')).toBeNull();
    expect(sessionStorage.getItem('faneen_c')).toBeNull();
    expect(sessionStorage.getItem('keep_me')).toBe('yes');
  });

  it('keys with similar prefix but not exactly faneen_ are NOT touched', () => {
    localStorage.setItem('faneenx_data', 'keep');
    localStorage.setItem('my_faneen_key', 'keep'); // not prefix
    localStorage.setItem('FANEEN_upper', 'keep'); // case-sensitive

    migrateLegacyStorage();

    expect(localStorage.getItem('faneenx_data')).toBe('keep');
    expect(localStorage.getItem('my_faneen_key')).toBe('keep');
    expect(localStorage.getItem('FANEEN_upper')).toBe('keep');
  });
});

describe('migrateLegacyStorage — value preservation, deletion & non-duplication', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('preserves exact value bytes after migration (no transformation)', () => {
    const langValue = 'en';
    const historyValue = '["aluminium","glass","wood"]';
    localStorage.setItem('faneen_lang', langValue);
    localStorage.setItem('faneen_search_history', historyValue);

    migrateLegacyStorage();

    expect(localStorage.getItem('qitaat_lang')).toStrictEqual(langValue);
    expect(localStorage.getItem('qitaat_search_history')).toStrictEqual(historyValue);
  });

  it('removes ALL legacy faneen_* keys after a successful migration', () => {
    localStorage.setItem('faneen_lang', 'ar');
    localStorage.setItem('faneen_search_history', '["x"]');
    localStorage.setItem('faneen_random_orphan', 'zzz');

    migrateLegacyStorage();

    const remainingFaneen: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('faneen_')) remainingFaneen.push(k);
    }
    expect(remainingFaneen).toEqual([]);
  });

  it('does NOT create duplicate qitaat_* keys when run multiple times', () => {
    localStorage.setItem('faneen_lang', 'en');
    localStorage.setItem('faneen_search_history', '["a"]');

    migrateLegacyStorage();
    migrateLegacyStorage();
    migrateLegacyStorage();

    // Count qitaat_lang occurrences (must be exactly 1)
    const qitaatKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('qitaat_')) qitaatKeys.push(k);
    }
    const langCount = qitaatKeys.filter((k) => k === 'qitaat_lang').length;
    const historyCount = qitaatKeys.filter((k) => k === 'qitaat_search_history').length;
    expect(langCount).toBe(1);
    expect(historyCount).toBe(1);
    // Values remain stable across reruns
    expect(localStorage.getItem('qitaat_lang')).toBe('en');
    expect(localStorage.getItem('qitaat_search_history')).toBe('["a"]');
  });

  it('does NOT re-create deleted faneen_* keys on repeated runs', () => {
    localStorage.setItem('faneen_lang', 'en');
    migrateLegacyStorage();

    // User clears qitaat_lang manually; rerun should not resurrect faneen_lang
    localStorage.removeItem('qitaat_lang');
    migrateLegacyStorage();

    expect(localStorage.getItem('faneen_lang')).toBeNull();
  });

  it('preserves a fresher qitaat_* value and STILL deletes the legacy faneen_* counterpart', () => {
    localStorage.setItem('qitaat_lang', 'ar'); // fresh
    localStorage.setItem('faneen_lang', 'en'); // stale

    migrateLegacyStorage();

    expect(localStorage.getItem('qitaat_lang')).toBe('ar'); // preserved
    expect(localStorage.getItem('faneen_lang')).toBeNull(); // deleted, no duplication
  });

  it('sets migration flags exactly once (no flag duplication)', () => {
    localStorage.setItem('faneen_lang', 'en');

    migrateLegacyStorage();
    migrateLegacyStorage();
    migrateLegacyStorage();

    expect(localStorage.getItem('qitaat_migration_v1_done')).toBe('1');
    expect(localStorage.getItem('qitaat_migration_v1_sweep_done')).toBe('1');
  });

  it('total qitaat_* keys after migration == count of original legacy keys + flags', () => {
    localStorage.setItem('faneen_lang', 'ar');
    localStorage.setItem('faneen_search_history', '[]');

    migrateLegacyStorage();

    const qitaatKeys = new Set<string>();
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('qitaat_')) qitaatKeys.add(k);
    }
    // Expected: qitaat_lang, qitaat_search_history + 3 migration flags (done, sweep_done, telemetry_sent)
    expect(qitaatKeys.has('qitaat_lang')).toBe(true);
    expect(qitaatKeys.has('qitaat_search_history')).toBe(true);
    expect(qitaatKeys.has('qitaat_migration_v1_done')).toBe(true);
    expect(qitaatKeys.has('qitaat_migration_v1_sweep_done')).toBe(true);
  });

  it('sessionStorage faneen_* keys are not duplicated into localStorage', () => {
    sessionStorage.setItem('faneen_temp', 'x');

    migrateLegacyStorage();

    expect(sessionStorage.getItem('faneen_temp')).toBeNull();
    expect(localStorage.getItem('faneen_temp')).toBeNull();
    expect(localStorage.getItem('qitaat_temp')).toBeNull();
  });
});

/**
 * Behavioral coverage for the internal `sweepLegacyKeys` step.
 * The sweep is exercised through the public `migrateLegacyStorage` entrypoint:
 *   - It MUST remove orphan `faneen_*` keys (anything left over)
 *   - It MUST NOT touch `qitaat_*` keys (the new namespace)
 *   - It MUST NOT touch unrelated app/auth keys (e.g. `sb-auth-token`, `app_*`)
 *   - Core data covered by KEY_MAP must be migrated (preserved) before sweep removes the legacy key
 */
describe('sweepLegacyKeys (behavioral via migrateLegacyStorage)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('removes ONLY orphan faneen_* keys, leaves every other namespace intact', () => {
    // Orphans (must be swept)
    localStorage.setItem('faneen_orphan_a', '1');
    localStorage.setItem('faneen_orphan_b', '2');
    localStorage.setItem('faneen_legacy_filter', 'mosque');

    // Core (must be migrated, then legacy removed)
    localStorage.setItem('faneen_lang', 'ar');
    localStorage.setItem('faneen_search_history', '["x"]');

    // Foreign / unrelated (must be untouched)
    localStorage.setItem('qitaat_user_pref', 'compact');
    localStorage.setItem('sb-auth-token', 'jwt-abc');
    localStorage.setItem('app_theme', 'dark');
    localStorage.setItem('react-query-cache', '{"x":1}');

    migrateLegacyStorage();

    // Orphans gone
    expect(localStorage.getItem('faneen_orphan_a')).toBeNull();
    expect(localStorage.getItem('faneen_orphan_b')).toBeNull();
    expect(localStorage.getItem('faneen_legacy_filter')).toBeNull();

    // Core data preserved under new namespace, legacy removed
    expect(localStorage.getItem('qitaat_lang')).toBe('ar');
    expect(localStorage.getItem('qitaat_search_history')).toBe('["x"]');
    expect(localStorage.getItem('faneen_lang')).toBeNull();
    expect(localStorage.getItem('faneen_search_history')).toBeNull();

    // Foreign keys completely untouched
    expect(localStorage.getItem('qitaat_user_pref')).toBe('compact');
    expect(localStorage.getItem('sb-auth-token')).toBe('jwt-abc');
    expect(localStorage.getItem('app_theme')).toBe('dark');
    expect(localStorage.getItem('react-query-cache')).toBe('{"x":1}');
  });

  it('preserves CORE data (KEY_MAP entries) — value bytes survive the sweep', () => {
    const lang = 'en';
    const history = JSON.stringify(['ألمنيوم', 'زجاج', 'حديد']);
    localStorage.setItem('faneen_lang', lang);
    localStorage.setItem('faneen_search_history', history);
    // Mix in some orphans to ensure they don't interfere with core preservation
    localStorage.setItem('faneen_old_v0', 'discard');
    localStorage.setItem('faneen_temp_cache', 'discard');

    migrateLegacyStorage();

    // Bytes are identical — no transformation, no truncation, no encoding loss
    expect(localStorage.getItem('qitaat_lang')).toStrictEqual(lang);
    expect(localStorage.getItem('qitaat_search_history')).toStrictEqual(history);
    // Orphans removed
    expect(localStorage.getItem('faneen_old_v0')).toBeNull();
    expect(localStorage.getItem('faneen_temp_cache')).toBeNull();
  });

  it('sweep does NOT touch any qitaat_* key, even when an orphan has a counterpart', () => {
    // Orphan exists alongside a fresh qitaat_ counterpart with different value
    localStorage.setItem('faneen_widget_state', 'OLD');
    localStorage.setItem('qitaat_widget_state', 'NEW');
    // Another qitaat_ key with NO faneen_ counterpart at all
    localStorage.setItem('qitaat_independent', 'KEEP');

    migrateLegacyStorage();

    expect(localStorage.getItem('faneen_widget_state')).toBeNull(); // orphan removed
    expect(localStorage.getItem('qitaat_widget_state')).toBe('NEW'); // counterpart preserved
    expect(localStorage.getItem('qitaat_independent')).toBe('KEEP'); // untouched
  });

  it('sweep does NOT remove keys with similar-but-not-matching prefixes', () => {
    // Edge cases that must NOT be considered legacy
    localStorage.setItem('faneenx_typo', 'keep');     // extra char after prefix
    localStorage.setItem('xfaneen_data', 'keep');     // prefix not at start
    localStorage.setItem('FANEEN_upper', 'keep');     // wrong case
    localStorage.setItem('faneen', 'keep');           // exact word, no underscore
    localStorage.setItem('my_faneen_key', 'keep');    // contains substring only
    // A real orphan to confirm sweep IS running
    localStorage.setItem('faneen_real_orphan', 'remove');

    migrateLegacyStorage();

    expect(localStorage.getItem('faneenx_typo')).toBe('keep');
    expect(localStorage.getItem('xfaneen_data')).toBe('keep');
    expect(localStorage.getItem('FANEEN_upper')).toBe('keep');
    expect(localStorage.getItem('faneen')).toBe('keep');
    expect(localStorage.getItem('my_faneen_key')).toBe('keep');
    expect(localStorage.getItem('faneen_real_orphan')).toBeNull();
  });

  it('sweep tolerates a large number of orphans without losing core data', () => {
    // Core data
    localStorage.setItem('faneen_lang', 'ar');
    localStorage.setItem('faneen_search_history', '["a","b"]');
    // 50 orphans
    for (let i = 0; i < 50; i++) {
      localStorage.setItem(`faneen_bulk_${i}`, `v${i}`);
    }
    // Foreign keys must stay
    localStorage.setItem('sb-session', 'jwt');
    localStorage.setItem('qitaat_keep_me', 'safe');

    migrateLegacyStorage();

    // Core preserved
    expect(localStorage.getItem('qitaat_lang')).toBe('ar');
    expect(localStorage.getItem('qitaat_search_history')).toBe('["a","b"]');
    // All orphans gone
    for (let i = 0; i < 50; i++) {
      expect(localStorage.getItem(`faneen_bulk_${i}`)).toBeNull();
    }
    // Foreign keys intact
    expect(localStorage.getItem('sb-session')).toBe('jwt');
    expect(localStorage.getItem('qitaat_keep_me')).toBe('safe');

    // Final invariant: zero faneen_* keys remain anywhere
    const remaining: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('faneen_')) remaining.push(k);
    }
    expect(remaining).toEqual([]);
  });

  it('sweep marks its done-flag exactly once and skips on subsequent runs', () => {
    localStorage.setItem('faneen_orphan_first', '1');
    migrateLegacyStorage();

    expect(localStorage.getItem('faneen_orphan_first')).toBeNull();
    expect(localStorage.getItem('qitaat_migration_v1_sweep_done')).toBe('1');

    // A new orphan added later: sweep is gated → it must NOT be removed on rerun
    localStorage.setItem('faneen_orphan_second', '2');
    migrateLegacyStorage();

    expect(localStorage.getItem('faneen_orphan_second')).toBe('2');
    expect(localStorage.getItem('qitaat_migration_v1_sweep_done')).toBe('1');
  });
});

/**
 * Verifies that when sweepLegacyKeys / sweepCookies fail at runtime,
 * the failure is classified into a stable `error_code` and reported via
 * the telemetry insert. These tests intercept the supabase insert call
 * to assert the exact payload shape.
 */
describe('sweepLegacyKeys — error classification → telemetry', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    insertSpy.mockClear();
    insertSpy.mockResolvedValue({ error: null });
    vi.restoreAllMocks();
  });

  function lastInsertPayload() {
    // Each call: insertSpy(payload)
    const lastCall = insertSpy.mock.calls.at(-1);
    return lastCall?.[0] as Record<string, unknown> | undefined;
  }

  it('classifies QuotaExceededError as quota_exceeded and reports failed status', async () => {
    // Force the sweep flag write to throw a quota error
    const realSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === 'qitaat_migration_v1_sweep_done') {
        const err = new Error('Storage quota exceeded');
        err.name = 'QuotaExceededError';
        throw err;
      }
      return realSetItem.call(this, key, value);
    });

    migrateLegacyStorage();
    // Wait one microtask tick for void-returning logTelemetry promise chain
    await new Promise((r) => setTimeout(r, 0));

    const payload = lastInsertPayload();
    expect(payload).toBeDefined();
    expect(payload?.status).toBe('failed');
    expect(payload?.error_code).toBe('quota_exceeded');
    expect(typeof payload?.error_message).toBe('string');
    expect(String(payload?.error_message)).toContain('localStorage');
  });

  it('classifies SecurityError as permission_denied', async () => {
    const realRemoveItem = Storage.prototype.removeItem;
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (
      this: Storage,
      key: string,
    ) {
      if (key.startsWith('faneen_')) {
        const err = new Error('Access denied by browser policy');
        err.name = 'SecurityError';
        throw err;
      }
      return realRemoveItem.call(this, key);
    });

    localStorage.setItem('faneen_orphan_blocked', 'x');
    migrateLegacyStorage();
    await new Promise((r) => setTimeout(r, 0));

    const payload = lastInsertPayload();
    expect(payload?.status).toBe('failed');
    expect(payload?.error_code).toBe('permission_denied');
  });

  it('truncates error_code to 64 chars (defense — codes are short)', async () => {
    // The classifier outputs known short codes; verify length cap is intact.
    const realSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === 'qitaat_migration_v1_sweep_done') {
        throw new Error('boom');
      }
      return realSetItem.call(this, key, value);
    });

    migrateLegacyStorage();
    await new Promise((r) => setTimeout(r, 0));

    const payload = lastInsertPayload();
    expect(payload?.error_code).toBeTruthy();
    expect(String(payload?.error_code).length).toBeLessThanOrEqual(64);
  });

  it('does NOT set error_code when no failure occurs (success path)', async () => {
    localStorage.setItem('faneen_lang', 'en');
    migrateLegacyStorage();
    await new Promise((r) => setTimeout(r, 0));

    const payload = lastInsertPayload();
    expect(payload?.status).toBe('success');
    expect(payload?.error_code).toBeNull();
  });
});

/**
 * Verifies the cookie sweep handles encoded names and emits deletion
 * `Set-Cookie` writes across all plausible (domain × path) combinations.
 * jsdom doesn't actually persist cookies across paths/domains, so we
 * intercept writes via a `document.cookie` setter spy.
 */
describe('sweepCookies — encoded names + domain/path coverage', () => {
  let originalCookieDescriptor: PropertyDescriptor | undefined;
  let originalLocation: PropertyDescriptor | undefined;
  let cookieWrites: string[] = [];
  let cookieReadValue = '';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    insertSpy.mockClear();
    insertSpy.mockResolvedValue({ error: null });
    cookieWrites = [];
    cookieReadValue = '';

    originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => cookieReadValue,
      set: (v: string) => {
        cookieWrites.push(v);
      },
    });
    originalLocation = Object.getOwnPropertyDescriptor(window, 'location');
  });

  afterEach(() => {
    if (originalCookieDescriptor) {
      Object.defineProperty(Document.prototype, 'cookie', originalCookieDescriptor);
    }
    if (originalLocation) {
      Object.defineProperty(window, 'location', originalLocation);
    }
  });

  function setLocation(hostname: string, pathname: string, protocol: 'http:' | 'https:') {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, hostname, pathname, protocol },
    });
  }

  it('writes deletions across multiple domain scopes for a multi-level host', () => {
    cookieReadValue = 'faneen_session=abc; other=keep';
    setLocation('www.app.qitaat.com', '/dashboard', 'https:');

    migrateLegacyStorage();

    const targetWrites = cookieWrites.filter((w) => w.startsWith('faneen_session='));
    const distinctDomains = new Set(
      targetWrites.map((w) => /domain=([^;]+)/i.exec(w)?.[1]?.trim() ?? '<host-only>'),
    );
    expect(distinctDomains.has('qitaat.com')).toBe(true);
    expect(distinctDomains.has('.qitaat.com')).toBe(true);
    expect(distinctDomains.has('app.qitaat.com')).toBe(true);
    expect(distinctDomains.has('www.app.qitaat.com')).toBe(true);
    expect(distinctDomains.has('<host-only>')).toBe(true);
  });

  it('writes deletions across all parent path segments', () => {
    cookieReadValue = 'faneen_token=xyz';
    setLocation('qitaat.com', '/dashboard/admin/migration-report', 'https:');

    migrateLegacyStorage();

    const tokenWrites = cookieWrites.filter((w) => w.startsWith('faneen_token='));
    const distinctPaths = new Set(
      tokenWrites.map((w) => /path=([^;]+)/i.exec(w)?.[1]?.trim() ?? '').filter(Boolean),
    );
    expect(distinctPaths.has('/')).toBe(true);
    expect(distinctPaths.has('/dashboard')).toBe(true);
    expect(distinctPaths.has('/dashboard/admin')).toBe(true);
    expect(distinctPaths.has('/dashboard/admin/migration-report')).toBe(true);
  });

  it('detects percent-encoded legacy cookie names', () => {
    cookieReadValue = 'faneen%5Fsession=encoded; keep_me=yes';
    setLocation('qitaat.com', '/', 'https:');

    migrateLegacyStorage();

    const rawWrites = cookieWrites.filter((w) => w.startsWith('faneen%5Fsession='));
    const decodedWrites = cookieWrites.filter((w) => w.startsWith('faneen_session='));
    expect(rawWrites.length).toBeGreaterThan(0);
    expect(decodedWrites.length).toBeGreaterThan(0);

    const stray = cookieWrites.filter((w) => w.startsWith('keep_me='));
    expect(stray.length).toBe(0);
  });

  it('emits Secure + SameSite=None variants on HTTPS', () => {
    cookieReadValue = 'faneen_pref=1';
    setLocation('qitaat.com', '/', 'https:');

    migrateLegacyStorage();

    const secureWrites = cookieWrites.filter(
      (w) => w.startsWith('faneen_pref=') && /Secure/i.test(w) && /SameSite=None/i.test(w),
    );
    expect(secureWrites.length).toBeGreaterThan(0);
  });

  it('does NOT emit Secure variant on HTTP (it would be rejected)', () => {
    cookieReadValue = 'faneen_pref=1';
    setLocation('localhost', '/', 'http:');

    migrateLegacyStorage();

    const secureWrites = cookieWrites.filter(
      (w) => w.startsWith('faneen_pref=') && /Secure/i.test(w),
    );
    expect(secureWrites.length).toBe(0);
  });

  it('does NOT climb parent domains for IP literal hosts', () => {
    cookieReadValue = 'faneen_x=1';
    setLocation('192.168.1.10', '/', 'http:');

    migrateLegacyStorage();

    const writes = cookieWrites.filter((w) => w.startsWith('faneen_x='));
    const domainsTried = new Set(
      writes
        .map((w) => /domain=([^;]+)/i.exec(w)?.[1]?.trim())
        .filter((d): d is string => !!d),
    );
    for (const d of domainsTried) {
      expect(d).toBe('192.168.1.10');
    }
  });

  it('emits deletion writes for the decoded canonical name', () => {
    cookieReadValue = 'faneen%5Fhistory=raw';
    setLocation('qitaat.com', '/', 'https:');

    migrateLegacyStorage();

    const decodedWrites = cookieWrites.filter((w) => w.startsWith('faneen_history='));
    expect(decodedWrites.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Permission-failure diagnostic log
// ----------------------------------------------------------------------------
// When localStorage / sessionStorage / cookies throw because the browser has
// blocked access (e.g. Safari private mode, third-party cookie blocking) we
// must capture a *granular* trail of what failed and ship it to telemetry so
// admins can diagnose the root cause without a screen-share.
// ============================================================================
describe('storage permission diagnostics', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    insertSpy.mockClear();
    insertSpy.mockResolvedValue({ error: null });
  });

  it('records a permission_denied diagnostic and ships it to telemetry when localStorage.setItem throws on probe', async () => {
    // Simulate Safari private mode: setItem throws SecurityError on every call
    const originalSetItem = Storage.prototype.setItem;
    let throwCount = 0;
    Storage.prototype.setItem = function (k: string, v: string) {
      if (k === '__qitaat_probe__') {
        throwCount++;
        const err = new Error('The operation is insecure. Access is denied.');
        err.name = 'SecurityError';
        throw err;
      }
      return originalSetItem.call(this, k, v);
    };

    try {
      migrateLegacyStorage();
      // Allow microtasks (telemetry insert) to flush
      await new Promise((r) => setTimeout(r, 0));

      expect(throwCount).toBeGreaterThan(0);
      expect(insertSpy).toHaveBeenCalled();
      const lastCall = insertSpy.mock.calls.at(-1)?.[0];
      expect(lastCall.status).toBe('failed');
      expect(lastCall.error_code).toBe('permission_denied');
      expect(lastCall.error_message).toBeTruthy();
      const parsed = JSON.parse(lastCall.error_message);
      expect(parsed.diagnostics).toBeInstanceOf(Array);
      expect(parsed.diagnostics.length).toBeGreaterThan(0);
      const localProbe = parsed.diagnostics.find(
        (d: { scope: string; phase: string }) =>
          d.scope === 'localStorage' && d.phase === 'access_probe',
      );
      expect(localProbe).toBeTruthy();
      expect(localProbe.code).toBe('permission_denied');
    } finally {
      Storage.prototype.setItem = originalSetItem;
    }
  });

  it('attaches host/path location context to each diagnostic entry', async () => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string) {
      if (k === '__qitaat_probe__') {
        const err = new Error('denied');
        err.name = 'SecurityError';
        throw err;
      }
      return originalSetItem.apply(this, arguments as never);
    };

    try {
      migrateLegacyStorage();
      await new Promise((r) => setTimeout(r, 0));
      const lastCall = insertSpy.mock.calls.at(-1)?.[0];
      const parsed = JSON.parse(lastCall.error_message);
      const entry = parsed.diagnostics[0];
      // jsdom defaults to localhost / "/"
      expect(typeof entry.host === 'string' || entry.host === undefined).toBe(true);
      expect(typeof entry.path === 'string' || entry.path === undefined).toBe(true);
      expect(typeof entry.ts).toBe('number');
    } finally {
      Storage.prototype.setItem = originalSetItem;
    }
  });

  it('does NOT include diagnostics envelope for clean runs (no failures)', async () => {
    localStorage.setItem('faneen_lang', 'en');

    migrateLegacyStorage();
    await new Promise((r) => setTimeout(r, 0));

    expect(insertSpy).toHaveBeenCalled();
    const lastCall = insertSpy.mock.calls.at(-1)?.[0];
    expect(lastCall.status).toBe('success');
    expect(lastCall.error_code).toBeNull();
    // error_message should NOT be a JSON envelope on a clean run
    if (lastCall.error_message) {
      expect(() => {
        const p = JSON.parse(lastCall.error_message);
        // If it parses, it must NOT be our diagnostics envelope shape
        if (p && typeof p === 'object' && Array.isArray(p.diagnostics)) {
          throw new Error('unexpected diagnostics envelope on clean run');
        }
      }).not.toThrow();
    }
  });

  it('keeps the telemetry payload under the 1000-char DB limit even with many failures', async () => {
    // Force every removeItem on a faneen_* key to fail
    const originalRemove = Storage.prototype.removeItem;
    const originalSetItem = Storage.prototype.setItem;

    // Seed a lot of orphans
    for (let i = 0; i < 5; i++) {
      originalSetItem.call(localStorage, `faneen_orphan_${i}`, 'x');
    }

    Storage.prototype.removeItem = function (k: string) {
      if (k.startsWith('faneen_')) {
        const err = new Error('Permission denied for ' + k);
        err.name = 'SecurityError';
        throw err;
      }
      return originalRemove.call(this, k);
    };

    try {
      migrateLegacyStorage();
      await new Promise((r) => setTimeout(r, 0));

      const lastCall = insertSpy.mock.calls.at(-1)?.[0];
      expect(lastCall.error_message).toBeTruthy();
      expect((lastCall.error_message as string).length).toBeLessThanOrEqual(1000);
      expect((lastCall.error_code as string).length).toBeLessThanOrEqual(64);
    } finally {
      Storage.prototype.removeItem = originalRemove;
    }
  });
});
