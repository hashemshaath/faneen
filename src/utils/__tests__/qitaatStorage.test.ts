import { describe, it, expect, beforeEach } from 'vitest';
import {
  readQitaatItem,
  writeQitaatItem,
  removeQitaatItem,
  readQitaatJSON,
  writeQitaatJSON,
} from '../qitaatStorage';

describe('qitaatStorage helper', () => {
  beforeEach(() => localStorage.clear());

  it('reads new qitaat_ key when present (ignores legacy)', () => {
    localStorage.setItem('qitaat_lang', 'en');
    localStorage.setItem('faneen_lang', 'ar'); // should be ignored
    expect(readQitaatItem('qitaat_lang')).toBe('en');
  });

  it('falls back to legacy faneen_ key when qitaat_ missing', () => {
    localStorage.setItem('faneen_lang', 'ar');
    expect(readQitaatItem('qitaat_lang')).toBe('ar');
  });

  it('returns null when neither key exists', () => {
    expect(readQitaatItem('qitaat_unknown')).toBeNull();
  });

  it('write removes legacy counterpart to prevent stale reads', () => {
    localStorage.setItem('faneen_lang', 'ar');
    writeQitaatItem('qitaat_lang', 'en');
    expect(localStorage.getItem('qitaat_lang')).toBe('en');
    expect(localStorage.getItem('faneen_lang')).toBeNull();
  });

  it('remove clears both new and legacy keys', () => {
    localStorage.setItem('qitaat_search_history', '[]');
    localStorage.setItem('faneen_search_history', '[]');
    removeQitaatItem('qitaat_search_history');
    expect(localStorage.getItem('qitaat_search_history')).toBeNull();
    expect(localStorage.getItem('faneen_search_history')).toBeNull();
  });

  it('readQitaatJSON parses valid JSON from new key', () => {
    localStorage.setItem('qitaat_search_history', '["a","b"]');
    expect(readQitaatJSON('qitaat_search_history', [])).toEqual(['a', 'b']);
  });

  it('readQitaatJSON falls back to legacy JSON when new missing', () => {
    localStorage.setItem('faneen_search_history', '["legacy"]');
    expect(readQitaatJSON('qitaat_search_history', [])).toEqual(['legacy']);
  });

  it('readQitaatJSON returns fallback on invalid JSON', () => {
    localStorage.setItem('qitaat_search_history', 'not-json');
    expect(readQitaatJSON('qitaat_search_history', ['default'])).toEqual(['default']);
  });

  it('writeQitaatJSON serializes and removes legacy counterpart', () => {
    localStorage.setItem('faneen_search_history', '["old"]');
    writeQitaatJSON('qitaat_search_history', ['new']);
    expect(JSON.parse(localStorage.getItem('qitaat_search_history')!)).toEqual(['new']);
    expect(localStorage.getItem('faneen_search_history')).toBeNull();
  });

  it('does not generate legacy key for non-qitaat prefixed keys', () => {
    // If someone passes a non-prefixed key, fallback simply returns null (no legacy mapping)
    expect(readQitaatItem('arbitrary_key')).toBeNull();
  });
});
