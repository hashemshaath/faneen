import { describe, it, expect, beforeEach } from 'vitest';
import {
  readRecentContext,
  recordRecentContext,
  clearRecentContext,
  MAX_ENTRIES,
  RECENT_CONTEXT_STORAGE_KEY,
} from '@/modules/workspace/shell/recentContextStore';

describe('APP-SHELL-1 — recent context store', () => {
  beforeEach(() => { clearRecentContext(); });

  it('records, dedupes by path+ref, and orders newest first', () => {
    recordRecentContext({ ref: 'WO-1', label: 'a', path: '/x', kind: 'work-order' });
    recordRecentContext({ ref: 'WO-2', label: 'b', path: '/y', kind: 'work-order' });
    recordRecentContext({ ref: 'WO-1', label: 'a-again', path: '/x', kind: 'work-order' });
    const entries = readRecentContext();
    expect(entries.map((e) => e.ref)).toEqual(['WO-1', 'WO-2']);
    expect(entries[0].label).toBe('a-again');
  });

  it('caps at MAX_ENTRIES', () => {
    for (let i = 0; i < MAX_ENTRIES + 5; i++) {
      recordRecentContext({ ref: `WO-${i}`, label: `t${i}`, path: `/p/${i}`, kind: 'work-order' });
    }
    expect(readRecentContext()).toHaveLength(MAX_ENTRIES);
  });

  it('returns [] for malformed payload', () => {
    window.localStorage.setItem(RECENT_CONTEXT_STORAGE_KEY, 'not-json');
    expect(readRecentContext()).toEqual([]);
    window.localStorage.setItem(RECENT_CONTEXT_STORAGE_KEY, JSON.stringify({ v: 99, entries: [] }));
    expect(readRecentContext()).toEqual([]);
  });

  it('clearRecentContext wipes storage', () => {
    recordRecentContext({ ref: 'WO-1', label: 'a', path: '/x', kind: 'work-order' });
    expect(readRecentContext()).toHaveLength(1);
    clearRecentContext();
    expect(readRecentContext()).toEqual([]);
  });
});