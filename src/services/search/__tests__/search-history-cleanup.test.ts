import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use a fresh module instance per test so the in-memory `legacyPurgedThisSession`
// flag inside useSearch.ts is reset between cases.
const loadModule = async () => {
  vi.resetModules();
  return import('../useSearch');
};

describe('Search history — legacy faneen_* hardening', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('purges known legacy faneen_*search* keys on first read', async () => {
    localStorage.setItem('faneen_search_history', JSON.stringify(['old', 'stale']));
    localStorage.setItem('faneen_recent_searches', 'whatever');
    sessionStorage.setItem('faneen_history', JSON.stringify(['x']));

    const { getSearchHistory } = await loadModule();
    const history = getSearchHistory();

    expect(history).toEqual([]);
    expect(localStorage.getItem('faneen_search_history')).toBeNull();
    expect(localStorage.getItem('faneen_recent_searches')).toBeNull();
    expect(sessionStorage.getItem('faneen_history')).toBeNull();
    // Persisted purge flag prevents re-running
    expect(localStorage.getItem('qitaat_search_history_legacy_purged_v1')).toBe('1');
  });

  it('sweeps any other faneen_*search/history/recent* variant', async () => {
    localStorage.setItem('faneen_user_search_log', JSON.stringify(['a']));
    localStorage.setItem('faneen_recent', 'b');
    localStorage.setItem('faneen_unrelated', 'keep-me'); // not search-related → stays

    const { getSearchHistory } = await loadModule();
    getSearchHistory();

    expect(localStorage.getItem('faneen_user_search_log')).toBeNull();
    expect(localStorage.getItem('faneen_recent')).toBeNull();
    // Non-search faneen_* keys are NOT touched here (main.tsx handles those).
    expect(localStorage.getItem('faneen_unrelated')).toBe('keep-me');
  });

  it('never returns legacy data even if both old and new keys exist', async () => {
    localStorage.setItem('faneen_search_history', JSON.stringify(['LEGACY-LEAK']));
    localStorage.setItem('qitaat_search_history', JSON.stringify(['real-1', 'real-2']));

    const { getSearchHistory } = await loadModule();
    const history = getSearchHistory();

    expect(history).toEqual(['real-1', 'real-2']);
    expect(history).not.toContain('LEGACY-LEAK');
    expect(localStorage.getItem('faneen_search_history')).toBeNull();
  });

  it('rejects malformed payloads (non-array, non-string items, too short/long)', async () => {
    // 1. Object instead of array
    localStorage.setItem('qitaat_search_history', JSON.stringify({ evil: true }));
    let mod = await loadModule();
    expect(mod.getSearchHistory()).toEqual([]);

    // 2. Mixed garbage
    const longString = 'x'.repeat(500);
    localStorage.setItem(
      'qitaat_search_history',
      JSON.stringify(['ok', '', 'a', 123, null, longString, 'good']),
    );
    mod = await loadModule();
    expect(mod.getSearchHistory()).toEqual(['ok', 'good']);

    // 3. Stored value should have been rewritten cleanly
    expect(JSON.parse(localStorage.getItem('qitaat_search_history')!)).toEqual(['ok', 'good']);
  });

  it('recovers from corrupt JSON by wiping the key', async () => {
    localStorage.setItem('qitaat_search_history', '{this is not json');
    const { getSearchHistory } = await loadModule();
    expect(getSearchHistory()).toEqual([]);
    expect(localStorage.getItem('qitaat_search_history')).toBeNull();
  });

  it('deduplicates entries when adding', async () => {
    const { addToSearchHistory, getSearchHistory } = await loadModule();
    addToSearchHistory('ألمنيوم');
    addToSearchHistory('ألمنيوم');
    addToSearchHistory('  ألمنيوم  '); // trimmed → duplicate
    addToSearchHistory('حديد');
    expect(getSearchHistory()).toEqual(['حديد', 'ألمنيوم']);
  });

  it('skips the legacy purge on subsequent calls (idempotent)', async () => {
    const { getSearchHistory } = await loadModule();
    getSearchHistory(); // first call sets the persisted flag
    const removeSpy = vi.spyOn(Storage.prototype, 'removeItem');
    getSearchHistory(); // second call should NOT touch faneen_* keys
    const faneenRemovals = removeSpy.mock.calls.filter((c) =>
      String(c[0]).startsWith('faneen_'),
    );
    expect(faneenRemovals).toHaveLength(0);
    removeSpy.mockRestore();
  });
});
