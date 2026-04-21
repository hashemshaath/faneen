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
