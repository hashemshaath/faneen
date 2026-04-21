import { describe, it, expect, beforeEach, vi } from 'vitest';

const insertSpy = vi.fn().mockResolvedValue({ error: null });
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ insert: insertSpy }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

import {
  registerProtectedKey,
  registerProtectedKeys,
  registerProtectedPattern,
  unregisterProtectedKey,
  unregisterProtectedPattern,
  getProtectedKeysSnapshot,
  _resetRuntimeProtectedKeys,
  migrateLegacyStorage,
  runMigrationManually,
} from '../migrateLocalStorage';

describe('Runtime protected-keys registry', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    _resetRuntimeProtectedKeys();
    insertSpy.mockClear();
  });

  it('registerProtectedKey adds a new key and reports it as added', () => {
    expect(registerProtectedKey('faneen_my_feature')).toBe(true);
    // Idempotent — second call is a no-op
    expect(registerProtectedKey('faneen_my_feature')).toBe(false);

    const snap = getProtectedKeysSnapshot();
    expect(snap.runtime).toContain('faneen_my_feature');
  });

  it('registerProtectedKey refuses to re-add static config entries', () => {
    // 'faneen_lang' is in the static PROTECTED_KEYS
    expect(registerProtectedKey('faneen_lang')).toBe(false);
    const snap = getProtectedKeysSnapshot();
    expect(snap.runtime).not.toContain('faneen_lang');
    expect(snap.static).toContain('faneen_lang');
  });

  it('registerProtectedKeys bulk-adds and reports the new count', () => {
    const added = registerProtectedKeys([
      'faneen_a', 'faneen_b', 'faneen_a', // dup
      'faneen_lang',                      // already static
    ]);
    expect(added).toBe(2);
    const snap = getProtectedKeysSnapshot();
    expect(snap.runtime).toEqual(expect.arrayContaining(['faneen_a', 'faneen_b']));
  });

  it('runtime-registered key SURVIVES a sweep', () => {
    localStorage.setItem('faneen_keep_this', 'precious');
    localStorage.setItem('faneen_burn_this', 'orphan');

    registerProtectedKey('faneen_keep_this');
    migrateLegacyStorage();

    expect(localStorage.getItem('faneen_keep_this')).toBe('precious');
    expect(localStorage.getItem('faneen_burn_this')).toBeNull();
  });

  it('runtime-registered key SURVIVES a sweep in sessionStorage too', () => {
    sessionStorage.setItem('faneen_session_keep', 'precious');
    sessionStorage.setItem('faneen_session_burn', 'orphan');

    registerProtectedKey('faneen_session_keep');
    migrateLegacyStorage();

    expect(sessionStorage.getItem('faneen_session_keep')).toBe('precious');
    expect(sessionStorage.getItem('faneen_session_burn')).toBeNull();
  });

  it('glob pattern faneen_widget_* protects every matching key', async () => {
    // Many keys to make sure both sync + batched paths honour the pattern
    for (let i = 0; i < 5; i++) {
      localStorage.setItem(`faneen_widget_${i}`, `v${i}`);
    }
    for (let i = 0; i < 60; i++) {
      localStorage.setItem(`faneen_garbage_${i}`, 'x');
    }
    registerProtectedPattern('faneen_widget_*');

    const result = await runMigrationManually();

    // None of the protected widget_* keys was swept
    for (let i = 0; i < 5; i++) {
      expect(localStorage.getItem(`faneen_widget_${i}`)).toBe(`v${i}`);
    }
    // All orphan garbage_* keys are gone
    for (let i = 0; i < 60; i++) {
      expect(localStorage.getItem(`faneen_garbage_${i}`)).toBeNull();
    }
    expect(result.sweptLocal).toBe(60);
  });

  it('? wildcard matches exactly one character', () => {
    registerProtectedPattern('faneen_v?_state');
    localStorage.setItem('faneen_v1_state', 'keep');     // matches
    localStorage.setItem('faneen_v2_state', 'keep');     // matches
    localStorage.setItem('faneen_v10_state', 'orphan');  // does NOT match (?_ = 1 char)

    migrateLegacyStorage();

    expect(localStorage.getItem('faneen_v1_state')).toBe('keep');
    expect(localStorage.getItem('faneen_v2_state')).toBe('keep');
    expect(localStorage.getItem('faneen_v10_state')).toBeNull();
  });

  it('unregisterProtectedKey removes a runtime entry but not static ones', () => {
    registerProtectedKey('faneen_temp_protected');
    expect(unregisterProtectedKey('faneen_temp_protected')).toBe(true);
    expect(unregisterProtectedKey('faneen_temp_protected')).toBe(false);
    // Static entries cannot be unregistered
    expect(unregisterProtectedKey('faneen_lang')).toBe(false);
  });

  it('unregisterProtectedPattern removes a previously added pattern', () => {
    registerProtectedPattern('faneen_x_*');
    expect(unregisterProtectedPattern('faneen_x_*')).toBe(true);
    expect(unregisterProtectedPattern('faneen_x_*')).toBe(false);

    // After unregistering, matching keys ARE swept
    localStorage.setItem('faneen_x_orphan', 'gone');
    migrateLegacyStorage();
    expect(localStorage.getItem('faneen_x_orphan')).toBeNull();
  });

  it('regex meta-characters in pattern source are escaped (literal match)', () => {
    // `.` should be literal, not "any char"
    registerProtectedPattern('faneen_a.b');
    localStorage.setItem('faneen_a.b', 'keep');
    localStorage.setItem('faneen_aXb', 'orphan'); // would match if `.` were regex

    migrateLegacyStorage();

    expect(localStorage.getItem('faneen_a.b')).toBe('keep');
    expect(localStorage.getItem('faneen_aXb')).toBeNull();
  });

  it('snapshot returns independent arrays — mutating them is safe', () => {
    registerProtectedKey('faneen_snap');
    const snap = getProtectedKeysSnapshot();
    snap.runtime.push('faneen_polluted');
    snap.static.push('faneen_polluted');
    snap.patterns.push('faneen_polluted_*');

    const snap2 = getProtectedKeysSnapshot();
    expect(snap2.runtime).not.toContain('faneen_polluted');
    expect(snap2.static).not.toContain('faneen_polluted');
    expect(snap2.patterns).not.toContain('faneen_polluted_*');
  });
});
