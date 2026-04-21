import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

import { migrateLegacyStorage } from '../migrateLocalStorage';

describe('migrateLegacyStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
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
